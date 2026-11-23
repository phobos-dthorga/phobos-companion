//! The Publish page (0.69.0; the owner, 23 Nov 2026: Ostranauts' publishing scripts brought "over to the Companion now, especially in
//! a visual way for the user to modify and upload their mods easily", and "The Steam Workshop uploader should be genericized as far
//! as is possible"; `docs/publishing.md`). It reads and acts through the kit's `steam-publish`, for every repository of a game that
//! keeps a Workshop catalogue (`config/workshop-publishing.json`); no game is named here.
//!
//! - **Reading**: `status` and `pending` for each repository, `show` and `page` for one mod. Only reads.
//! - **The page's text**: `page --check --stdin` checks a text without writing; `page --write --stdin` saves it, only on the owner's
//!   press, only while the manifest calls `page` `writes`; the kit refuses a text with problems.
//! - **Prepare**: `notes --write` then `prepare` (`--build` when chosen): writes only release notes in the repository and a
//!   candidate in the kit's cache, on a press, while the manifest calls them `writes` and `runs`.
//! - **Upload, Make public, Update all waiting**: the kit's `upload` and `update`, **only while the manifest calls them
//!   `owner-press`**, only on the owner's press and their yes in the window, and only while the owner's **Workshop uploads**
//!   setting is on. A new item is always created private; public is an update with `--confirm-public`, which the window sends only
//!   after its second, stronger yes. Never run by itself, and never in a test: agents never press it (the Workshop rule).
//! - **Read Steam back**: `pull --visibility --changelog --write`, which reads Steam's public API without a key, only while the
//!   Workshop pages kind of going online is on.
//! - **Open in Steam** hands the system `steam://url/CommunityFilePage/<number>`, for a number the last `show` named.
//!
//! The host checks every name: the game is on the list, the repository is one of its repositories and keeps a catalogue, and the
//! mod is one the last reading of that repository named.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit::{self, Outcome};
use companion_core::online;
use companion_core::prefs;
use serde::Serialize;
use serde_json::{Value, json};
use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub const TOOL: &str = "steam-publish";
const CATALOGUE: [&str; 2] = ["config", "workshop-publishing.json"];
/// The going-online kind that Read Steam back needs (`companion_core::online::KINDS`).
pub const STEAM_KIND: &str = "workshop-pages";
/// The owner's Workshop uploads setting, kept in the program's own folder.
const SETTING_FILE: &str = "publishing.json";
const SETTING_KEY: &str = "uploads";
/// The longest page text the window may send: Steam takes 8,000 bytes, so anything far beyond it is not a page.
pub const MAX_TEXT_BYTES: usize = 64 * 1024;
const MAX_MOD_NAME: usize = 120;

/// Mods each repository's last reading named, as (repository path, mod).
static KNOWN_MODS: Mutex<BTreeSet<(PathBuf, String)>> = Mutex::new(BTreeSet::new());
/// Workshop numbers the last `show` named, for Open in Steam.
static KNOWN_ITEMS: Mutex<BTreeSet<String>> = Mutex::new(BTreeSet::new());

/// What a press did: the kit's word, its reason when it refused, and its answer's data.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct PressResult {
    pub ok: bool,
    pub refusal: Option<String>,
    pub data: Value,
}

impl PressResult {
    fn of(answer: &Value) -> Self {
        let outcome = Outcome::of(answer);
        Self { ok: outcome.ok, refusal: outcome.refusal, data: answer["data"].clone() }
    }
}

// ---------------------------------------------------------------- the Workshop uploads setting

/// Whether the owner lets this program upload (default on: the agent's grade of the risk is moderate, so by the shared design rule
/// it starts on; `docs/publishing.md`).
pub fn uploads_on(data: &Path) -> bool {
    match prefs::read_json(&data.join(SETTING_FILE)) {
        Ok(Some(value)) => value[SETTING_KEY].as_bool().unwrap_or(true),
        _ => true,
    }
}

/// Keeps the owner's choice, written whole.
pub fn choose_uploads(data: &Path, on: bool) -> Result<bool, Failure> {
    prefs::write_json(&data.join(SETTING_FILE), &json!({"version": 1, SETTING_KEY: on}))?;
    Ok(uploads_on(data))
}

// ---------------------------------------------------------------- names

/// Whether a repository keeps a Workshop catalogue: only those are asked.
pub fn has_catalogue(root: &Path) -> bool {
    CATALOGUE.iter().fold(root.to_path_buf(), |path, part| path.join(part)).is_file()
}

/// A mod's catalogue name as the kit allows it (letters, digits, `_`, `.`, `-`, opening with a letter or digit).
pub fn mod_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= MAX_MOD_NAME
        && name.as_bytes()[0].is_ascii_alphanumeric()
        && name.bytes().all(|b| b.is_ascii_alphanumeric() || b"_.-".contains(&b))
}

/// A Workshop item number: digits, no leading zero, at most 20.
pub fn item_number(text: &str) -> bool {
    !text.is_empty() && text.len() <= 20 && !text.starts_with('0') && text.bytes().all(|b| b.is_ascii_digit())
}

/// The game's repositories that keep a catalogue, each on this PC.
fn publishing_repositories(game: &str) -> Result<Vec<games::Repository>, Failure> {
    Ok(games::repositories_of(game)?.into_iter().filter(|r| r.path.is_dir() && has_catalogue(&r.path)).collect())
}

/// One repository of the game that keeps a catalogue, by name, refused in words otherwise.
fn repository(game: &str, name: &str) -> Result<PathBuf, Failure> {
    if !checks::plain_name(name) {
        return Err(Failure::refused("that is not a repository's name"));
    }
    let found = games::named_repository(game, name)?;
    if !has_catalogue(&found.path) {
        return Err(Failure::refused(format!("{name} keeps no Workshop catalogue (config/workshop-publishing.json)")));
    }
    Ok(found.path)
}

/// The repository and a mod its last reading named.
fn known_mod(game: &str, name: &str, mod_: &str) -> Result<PathBuf, Failure> {
    let root = repository(game, name)?;
    if !mod_name(mod_) {
        return Err(Failure::refused("that is not a mod's name"));
    }
    let known = KNOWN_MODS.lock().map(|known| known.contains(&(root.clone(), mod_.to_owned()))).unwrap_or(false);
    if !known {
        return Err(Failure::refused(format!(
            "{mod_} was not in the last reading of {name}: read the page again first"
        )));
    }
    Ok(root)
}

fn remember_mods(root: &Path, status: &Value) {
    let names: Vec<String> = status["mods"]
        .as_array()
        .map(|rows| rows.iter().filter_map(|row| row["mod"].as_str().map(str::to_owned)).collect())
        .unwrap_or_default();
    if let Ok(mut known) = KNOWN_MODS.lock() {
        known.retain(|(path, _)| path != root);
        known.extend(names.into_iter().filter(|n| mod_name(n)).map(|n| (root.to_path_buf(), n)));
    }
}

/// Every Workshop number a card names: its own item and each Required item.
pub fn items_named(show: &Value) -> Vec<String> {
    let own = show["itemId"].as_str().map(str::to_owned);
    let required = show["requiredItems"]
        .as_array()
        .map(|items| items.iter().filter_map(|i| i["itemId"].as_str().map(str::to_owned)).collect::<Vec<_>>())
        .unwrap_or_default();
    own.into_iter().chain(required).filter(|n| item_number(n)).collect()
}

// ---------------------------------------------------------------- arguments

fn base(root: &Path, report: &str) -> Args {
    Args::new(TOOL, report).root(root)
}

pub fn status_arguments(root: &Path) -> Vec<String> {
    base(root, "status").flag("--no-redact").json()
}

pub fn pending_arguments(root: &Path) -> Vec<String> {
    base(root, "pending").flag("--no-redact").json()
}

pub fn show_arguments(root: &Path, mod_: &str) -> Vec<String> {
    base(root, "show").extend([mod_.to_owned()]).flag("--no-redact").json()
}

/// `page MOD`, with `--check` or `--write` and the text on standard input when a text is given.
pub fn page_arguments(root: &Path, mod_: &str, mode: Option<&str>) -> Vec<String> {
    let arguments = base(root, "page").extend([mod_.to_owned()]);
    match mode {
        Some(flag) => arguments.flag(flag).flag("--stdin").json(),
        None => arguments.json(),
    }
}

pub fn notes_arguments(root: &Path, mod_: &str) -> Vec<String> {
    base(root, "notes").extend([mod_.to_owned()]).flag("--write").json()
}

pub fn prepare_arguments(root: &Path, mod_: &str, build: bool) -> Vec<String> {
    let arguments = base(root, "prepare").extend([mod_.to_owned()]);
    if build { arguments.flag("--build").json() } else { arguments.json() }
}

/// How an upload is sent: the running Steam client, or SteamCMD in a window of its own (where the owner types the login).
pub fn sender_flags(via: &str) -> Result<Vec<String>, String> {
    match via {
        "steam" => Ok(vec!["--via".into(), "steam".into()]),
        "steamcmd" => Ok(vec!["--via".into(), "steamcmd".into(), "--new-console".into()]),
        _ => Err("send through the Steam client or SteamCMD".to_owned()),
    }
}

/// `upload MOD`: a new item (always private), an update keeping its visibility, or, after the owner's second yes, an update
/// that makes it public.
pub fn upload_arguments(root: &Path, mod_: &str, kind: &str, via: &str) -> Result<Vec<String>, String> {
    let arguments = base(root, "upload").extend([mod_.to_owned()]);
    let arguments = match kind {
        "create" => arguments.flag("--create"),
        "update" => arguments.flag("--update"),
        "public" => arguments.flag("--update").pair("--visibility", "public").flag("--confirm-public"),
        _ => return Err("that is not an upload this page offers".to_owned()),
    };
    Ok(arguments.extend(sender_flags(via)?).flag("--no-redact").json())
}

pub fn update_arguments(root: &Path, via: &str) -> Result<Vec<String>, String> {
    Ok(base(root, "update").extend(sender_flags(via)?).flag("--no-redact").json())
}

pub fn pull_arguments(root: &Path) -> Vec<String> {
    base(root, "pull").flag("--visibility").flag("--changelog").flag("--write").json()
}

// ---------------------------------------------------------------- reading

/// Every repository of the game that keeps a catalogue: its status and what waits, or why it could not be read.
pub fn read(game: &str, data: &Path) -> Result<Value, Failure> {
    let mut repositories = Vec::new();
    for found in publishing_repositories(game)? {
        let entry =
            match (kit::run(TOOL, &status_arguments(&found.path)), kit::run(TOOL, &pending_arguments(&found.path))) {
                (Ok(status), Ok(pending)) => {
                    let outcome = Outcome::of(&status);
                    if outcome.ok {
                        remember_mods(&found.path, &status["data"]);
                        json!({"repository": found.name, "status": status["data"], "pending": pending["data"]})
                    } else {
                        json!({"repository": found.name, "failure": outcome.refusal.unwrap_or_default()})
                    }
                }
                (Err(failure), _) | (_, Err(failure)) => json!({"repository": found.name, "failure": failure.detail}),
            };
        repositories.push(entry);
    }
    Ok(json!({
        "repositories": repositories,
        "uploads": uploads_on(data),
        "steamBack": online::is_on(data, STEAM_KIND),
    }))
}

/// How many versions wait across the game's repositories, for Home's note: mods whose item has a newer version than the one sent.
pub fn waiting(game: &str) -> Result<Value, Failure> {
    let mut count = 0;
    let mut names = Vec::new();
    for found in publishing_repositories(game)? {
        if let Ok(answer) = kit::run(TOOL, &pending_arguments(&found.path)) {
            for row in answer["data"]["mods"].as_array().map_or(&[][..], Vec::as_slice) {
                if row["needsUpload"].as_bool() == Some(true) {
                    count += 1;
                    names.push(row["mod"].as_str().unwrap_or_default().to_owned());
                }
            }
        }
    }
    Ok(json!({"waiting": count, "mods": names}))
}

/// One mod's card: the change note Steam would get, its tags and Required items, blockers and receipts.
pub fn show(game: &str, name: &str, mod_: &str) -> Result<Value, Failure> {
    let root = known_mod(game, name, mod_)?;
    let answer = kit::run(TOOL, &show_arguments(&root, mod_))?;
    Outcome::required(&answer)?;
    if let Ok(mut known) = KNOWN_ITEMS.lock() {
        known.extend(items_named(&answer["data"]));
    }
    Ok(answer["data"].clone())
}

/// A mod's Workshop page as text, with every problem the kit finds.
pub fn page(game: &str, name: &str, mod_: &str) -> Result<Value, Failure> {
    let root = known_mod(game, name, mod_)?;
    let answer = kit::run(TOOL, &page_arguments(&root, mod_, None))?;
    Outcome::required(&answer)?;
    Ok(answer["data"].clone())
}

fn sane_text(text: &str) -> Result<(), Failure> {
    if text.len() > MAX_TEXT_BYTES {
        return Err(Failure::refused("that text is far longer than a Workshop page"));
    }
    Ok(())
}

/// Checks a text without writing anything: its problems, size and budget.
pub fn check_page(game: &str, name: &str, mod_: &str, text: &str) -> Result<Value, Failure> {
    let root = known_mod(game, name, mod_)?;
    sane_text(text)?;
    let answer = kit::run_with_input(TOOL, &page_arguments(&root, mod_, Some("--check")), None, Some(text.as_bytes()))?;
    Ok(answer["data"].clone())
}

// ---------------------------------------------------------------- presses

/// Saves the page, on the owner's press: the kit refuses a text with problems.
pub fn save_page(game: &str, name: &str, mod_: &str, text: &str) -> Result<PressResult, Failure> {
    let root = known_mod(game, name, mod_)?;
    sane_text(text)?;
    kit::allowed_by_manifest(&kit::read_manifest()?, TOOL, "page").map_err(Failure::refused)?;
    let answer = kit::run_with_input(TOOL, &page_arguments(&root, mod_, Some("--write")), None, Some(text.as_bytes()))?;
    Ok(PressResult::of(&answer))
}

/// Writes the mod's release notes, then stages a checked candidate (offline), on the owner's press.
pub fn prepare(
    game: &str,
    name: &str,
    mod_: &str,
    build: bool,
    listener: Option<kit::Listener>,
) -> Result<PressResult, Failure> {
    let root = known_mod(game, name, mod_)?;
    let manifest = kit::read_manifest()?;
    kit::allowed_by_manifest(&manifest, TOOL, "notes").map_err(Failure::refused)?;
    kit::allowed_by_manifest(&manifest, TOOL, "prepare").map_err(Failure::refused)?;
    let notes = kit::run_hearing(TOOL, &notes_arguments(&root, mod_), listener)?;
    if !Outcome::of(&notes).ok {
        return Ok(PressResult::of(&notes));
    }
    Ok(PressResult::of(&kit::run_hearing(TOOL, &prepare_arguments(&root, mod_, build), listener)?))
}

/// The checks every upload passes before the kit sees it: the setting is on, and the manifest still calls it the owner's to press.
fn may_upload(data: &Path, report: &str) -> Result<(), Failure> {
    if !uploads_on(data) {
        return Err(Failure::refused("Workshop uploads are switched off in Settings"));
    }
    kit::allowed_on_press(&kit::read_manifest()?, TOOL, report).map_err(Failure::refused)
}

/// Sends one mod's newest candidate, on the owner's press and their yes in the window. `kind` is create, update or public.
pub fn upload(
    game: &str,
    name: &str,
    mod_: &str,
    kind: &str,
    via: &str,
    data: &Path,
    listener: Option<kit::Listener>,
) -> Result<PressResult, Failure> {
    let root = known_mod(game, name, mod_)?;
    let arguments = upload_arguments(&root, mod_, kind, via).map_err(Failure::refused)?;
    may_upload(data, "upload")?;
    Ok(PressResult::of(&kit::run_hearing(TOOL, &arguments, listener)?))
}

/// Builds, prepares and updates every item of the repository that has a newer version, dependencies first, on the owner's press.
pub fn update_all(
    game: &str,
    name: &str,
    via: &str,
    data: &Path,
    listener: Option<kit::Listener>,
) -> Result<PressResult, Failure> {
    let root = repository(game, name)?;
    let arguments = update_arguments(&root, via).map_err(Failure::refused)?;
    may_upload(data, "update")?;
    Ok(PressResult::of(&kit::run_hearing(TOOL, &arguments, listener)?))
}

/// Reads each item back from Steam's public API and writes what it shows (visibility, Released dates), on the owner's press.
pub fn pull(game: &str, name: &str, data: &Path, listener: Option<kit::Listener>) -> Result<PressResult, Failure> {
    let root = repository(game, name)?;
    if !online::is_on(data, STEAM_KIND) {
        return Err(Failure::refused("Workshop pages is switched off under Settings, Going online"));
    }
    kit::allowed_by_manifest(&kit::read_manifest()?, TOOL, "pull").map_err(Failure::refused)?;
    Ok(PressResult::of(&kit::run_hearing(TOOL, &pull_arguments(&root), listener)?))
}

/// Opens an item in the Steam client: only a number the last card named.
pub fn open_in_steam(number: &str) -> Result<(), Failure> {
    let known = KNOWN_ITEMS.lock().map(|known| known.contains(number)).unwrap_or(false);
    if !item_number(number) || !known {
        return Err(Failure::refused("only an item the last card named can be opened"));
    }
    companion_core::process::open_address(&format!("steam://url/CommunityFilePage/{number}"))
        .map_err(|problem| Failure::refused(problem.to_string()))
}

#[cfg(test)]
#[path = "tests/publish_page.rs"]
mod tests;
