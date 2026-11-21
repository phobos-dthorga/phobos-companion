//! The Mod list page (0.45.0; the owner, 22 Nov 2026: "We actually should have our own, third-party, mod managing", after RimSort
//! said only "1 missing mod" for a patch its author had taken off the Workshop). The first step of the program's own mod manager:
//! the kit's `mod-list check` says what is wrong with each of a game's lists of active mods and why, and offers changes.
//!
//! Three presses, each after the owner's yes on the card: **a change the last check offered** (take a mod off, keep the first of
//! two, switch a needed mod on) runs `mod-list fix --apply`; **Undo the last change** runs `mod-list undo --apply`; and **Open in
//! Steam** opens a mod's Workshop page in the Steam client, where the owner subscribes (only a Workshop number the last check
//! named). The kit keeps a backup of the list before every change, refuses while the game or a mod manager such as RimSort runs,
//! and refuses to undo over a list changed since. The host checks every name before the kit sees it, and runs a change only while
//! the kit's manifest calls it `writes`.
//!
//! **Edit the list** (0.46.0; the owner's choices of 22 Nov 2026: "each change saved at once", moving by buttons, a place typed and
//! pick-then-place, a search box with filters, on the same page): the kit's `mod-list mods` lists every mod on this PC and each
//! list in order, and each press of Switch on, Switch off or a move runs `mod-list fix --apply` at once, with no second yes; the
//! kit keeps a backup before each, and Undo the last change walks back one change at a time. The host accepts only a mod the last
//! listing named, a list it named, and a place from 1.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games::{self, GamePlaces};
use companion_core::kit::{self, Outcome, allowed_by_manifest};
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeSet;
use std::sync::Mutex;

const TOOL: &str = "mod-list";
const CHECK: &str = "check";
const FIX: &str = "fix";
const UNDO: &str = "undo";
const MODS: &str = "mods";
/// The editor's changes (0.46.0): switch off, switch on, move; each saved at once on the owner's press.
pub const EDITS: [&str; 3] = ["remove", "enable", "move"];
/// The furthest place the host passes on: far beyond any list's length; the kit keeps a place inside the list.
pub const MAX_PLACE: u32 = 100_000;
/// The changes the kit makes (`mod-list fix --remove`, `--remove-extra`, `--enable`).
pub const ACTIONS: [&str; 3] = ["remove", "remove-extra", "enable"];
/// The longest list key or mod id the host passes on: the kit's own are far shorter.
const MAX_TEXT: usize = 300;
const WORKSHOP_DIGITS: std::ops::RangeInclusive<usize> = 6..=20;

/// A change: (game, list, action, mod id).
pub type Change = (String, String, String, String);
/// A list: (game, list key).
pub type ListOf = (String, String);
/// What a check offers: its changes, the lists the kit changes, and the Workshop numbers it named.
pub type Offers = (Vec<Change>, Vec<ListOf>, Vec<String>);

/// Every change the last check of each game offered: the only changes the page may make.
static OFFERED: Mutex<BTreeSet<Change>> = Mutex::new(BTreeSet::new());
/// Every list the last check named as one the kit changes: the only lists Undo may touch.
static LISTS: Mutex<BTreeSet<ListOf>> = Mutex::new(BTreeSet::new());
/// (game, mod id) of every mod the last listing named, on this PC or on a list: the only mods the editor may change.
static KNOWN: Mutex<BTreeSet<ListOf>> = Mutex::new(BTreeSet::new());
/// Every Workshop number a check named in this run of the program: the only pages Open in Steam opens.
static WORKSHOP: Mutex<BTreeSet<String>> = Mutex::new(BTreeSet::new());

/// What a change or an undo did, or why the kit refused.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ChangeResult {
    pub ok: bool,
    pub title: String,
    pub refusal: Option<String>,
    pub data: Value,
}

fn named(arguments: Args, game: &GamePlaces) -> Args {
    let mut arguments = arguments.given("--name", &game.name);
    if let Some(app_id) = game.steam_app_id {
        arguments = arguments.given("--app-id", &app_id.to_string());
    }
    if let Some(data) = game.places.get("data") {
        arguments = arguments.path("--data", data);
    }
    arguments
}

pub fn check_arguments(game: &GamePlaces, online: bool) -> Vec<String> {
    let arguments = named(Args::new(TOOL, CHECK), game);
    let arguments = if online { arguments.flag("--online") } else { arguments };
    arguments.flag("--no-redact").json()
}

pub fn fix_arguments(game: &GamePlaces, list: &str, action: &str, id: &str) -> Vec<String> {
    named(Args::new(TOOL, FIX), game)
        .given("--list", list)
        .given(&format!("--{action}"), id)
        .flag("--apply")
        .flag("--no-redact")
        .json()
}

pub fn mods_arguments(game: &GamePlaces) -> Vec<String> {
    named(Args::new(TOOL, MODS), game).flag("--no-redact").json()
}

pub fn edit_arguments(game: &GamePlaces, list: &str, action: &str, id: &str, place: Option<u32>) -> Vec<String> {
    let arguments = named(Args::new(TOOL, FIX), game).given("--list", list).given(&format!("--{action}"), id);
    let arguments = match place {
        Some(place) => arguments.pair("--to", &place.to_string()),
        None => arguments,
    };
    arguments.flag("--apply").flag("--no-redact").json()
}

/// The mods a listing names (on this PC, or on one of its lists) and the lists the kit changes.
pub fn known_by(game: &str, data: &Value) -> (Vec<ListOf>, Vec<ListOf>) {
    let array = |value: &Value| value.as_array().map_or(&[][..], Vec::as_slice).to_vec();
    let mut ids: Vec<ListOf> = array(&data["mods"])
        .iter()
        .filter_map(|m| m["id"].as_str())
        .map(|id| (game.to_owned(), id.to_owned()))
        .collect();
    let mut lists = Vec::new();
    for list in array(&data["lists"]) {
        ids.extend(
            array(&list["entries"]).iter().filter_map(|e| e["id"].as_str()).map(|id| (game.to_owned(), id.to_owned())),
        );
        if list["writable"].as_bool() == Some(true)
            && let Some(key) = list["key"].as_str()
        {
            lists.push((game.to_owned(), key.to_owned()));
        }
    }
    (ids, lists)
}

/// Every mod on this PC and each list in order, for Edit the list. Only reads.
pub fn mods(game: &str, listener: Option<kit::Listener>) -> Result<Value, Failure> {
    let found = places(game)?;
    let data = kit::run_hearing(TOOL, &mods_arguments(&found), listener)?["data"].clone();
    let (ids, lists) = known_by(game, &data);
    if let Ok(mut known) = KNOWN.lock() {
        known.retain(|(g, _)| g != game);
        known.extend(ids);
    }
    if let Ok(mut known) = LISTS.lock() {
        known.extend(lists);
    }
    Ok(data)
}

/// One change from Edit the list, saved at once: switch a mod off or on, or move it to a place (1 is first).
pub fn edit(
    game: &str,
    list: &str,
    action: &str,
    id: &str,
    place: Option<u32>,
    listener: Option<kit::Listener>,
) -> Result<ChangeResult, Failure> {
    let found = places(game)?;
    if !EDITS.contains(&action) || !sane_text(list) || !sane_text(id) {
        return Err(Failure::refused("that is not a change the tools make"));
    }
    if place.is_some_and(|place| place == 0 || place > MAX_PLACE) || (action == "move" && place.is_none()) {
        return Err(Failure::refused("that is not a place on the list"));
    }
    let known_mod = KNOWN.lock().map(|known| known.contains(&(game.to_owned(), id.to_owned()))).unwrap_or(false);
    let known_list = LISTS.lock().map(|lists| lists.contains(&(game.to_owned(), list.to_owned()))).unwrap_or(false);
    if !known_mod || !known_list {
        return Err(Failure::refused(
            "only a mod and a list the last listing named can be changed: read the list again first",
        ));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, FIX).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &edit_arguments(&found, list, action, id, place), listener)?))
}

pub fn undo_arguments(game: &GamePlaces, list: &str) -> Vec<String> {
    named(Args::new(TOOL, UNDO), game).given("--list", list).flag("--apply").flag("--no-redact").json()
}

/// One line of text of a sane length: a list key or a mod id as the kit named it (a Project Zomboid id may hold spaces).
pub fn sane_text(text: &str) -> bool {
    !text.trim().is_empty() && text.chars().count() <= MAX_TEXT && !text.contains(['\n', '\r', '\0'])
}

/// A Steam Workshop number: digits only, of the length Steam's are.
pub fn workshop_number(text: &str) -> bool {
    WORKSHOP_DIGITS.contains(&text.len()) && text.bytes().all(|b| b.is_ascii_digit())
}

/// The changes, lists and Workshop numbers a check's data names, for the checks on later presses.
pub fn offered_by(game: &str, data: &Value) -> Offers {
    let mut changes = Vec::new();
    let mut numbers = Vec::new();
    for problem in data["problems"].as_array().map_or(&[][..], Vec::as_slice) {
        for fix in problem["fixes"].as_array().map_or(&[][..], Vec::as_slice) {
            if let (Some(action), Some(list), Some(id)) =
                (fix["action"].as_str(), fix["list_key"].as_str(), fix["id"].as_str())
            {
                changes.push((game.to_owned(), list.to_owned(), action.to_owned(), id.to_owned()));
            }
        }
        if let Some(number) = problem["workshop_id"].as_str().filter(|n| workshop_number(n)) {
            numbers.push(number.to_owned());
        }
    }
    let lists = data["lists"]
        .as_array()
        .map_or(&[][..], Vec::as_slice)
        .iter()
        .filter(|list| list["writable"].as_bool() == Some(true))
        .filter_map(|list| list["key"].as_str())
        .map(|key| (game.to_owned(), key.to_owned()))
        .collect();
    (changes, lists, numbers)
}

fn places(game: &str) -> Result<GamePlaces, Failure> {
    if !checks::plain_name(game) {
        return Err(Failure::refused("that is not a game's id"));
    }
    games::places_of(game)?.ok_or_else(|| Failure::refused(format!("{game} is not on the list")))
}

/// A game's check: every problem with each of its lists, and the changes offered. `online` also asks Steam which Workshop items
/// still exist (the kit's `reads-online`).
pub fn read(game: &str, online: bool, listener: Option<kit::Listener>) -> Result<Value, Failure> {
    let found = places(game)?;
    let data = kit::run_hearing(TOOL, &check_arguments(&found, online), listener)?["data"].clone();
    let (changes, lists, numbers) = offered_by(game, &data);
    if let Ok(mut offered) = OFFERED.lock() {
        offered.retain(|(g, ..)| g != game);
        offered.extend(changes);
    }
    if let Ok(mut known) = LISTS.lock() {
        known.retain(|(g, _)| g != game);
        known.extend(lists);
    }
    if let Ok(mut known) = WORKSHOP.lock() {
        known.extend(numbers);
    }
    Ok(data)
}

fn result_of(answer: &Value) -> ChangeResult {
    let outcome = Outcome::of(answer);
    ChangeResult {
        ok: outcome.ok,
        title: answer["report"]["title"].as_str().unwrap_or_default().to_owned(),
        refusal: outcome.refusal,
        data: answer["data"].clone(),
    }
}

/// One change the last check offered, made by the kit after a backup of the list.
pub fn change(
    game: &str,
    list: &str,
    action: &str,
    id: &str,
    listener: Option<kit::Listener>,
) -> Result<ChangeResult, Failure> {
    let found = places(game)?;
    if !ACTIONS.contains(&action) || !sane_text(list) || !sane_text(id) {
        return Err(Failure::refused("that is not a change the tools make"));
    }
    let key = (game.to_owned(), list.to_owned(), action.to_owned(), id.to_owned());
    if !OFFERED.lock().map(|offered| offered.contains(&key)).unwrap_or(false) {
        return Err(Failure::refused("only a change the last check offered can be made: check again first"));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, FIX).map_err(Failure::refused)?;
    let result = result_of(&kit::run_hearing(TOOL, &fix_arguments(&found, list, action, id), listener)?);
    if result.ok
        && let Ok(mut offered) = OFFERED.lock()
    {
        offered.remove(&key);
    }
    Ok(result)
}

/// Puts a list back as it was before the latest change the tools made to it.
pub fn undo(game: &str, list: &str, listener: Option<kit::Listener>) -> Result<ChangeResult, Failure> {
    let found = places(game)?;
    let known = LISTS.lock().map(|lists| lists.contains(&(game.to_owned(), list.to_owned()))).unwrap_or(false);
    if !sane_text(list) || !known {
        return Err(Failure::refused("only a list the last check named can be put back"));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, UNDO).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &undo_arguments(&found, list), listener)?))
}

/// The address Open in Steam hands the system: the Steam client's own page for a Workshop item.
pub fn steam_page(number: &str) -> String {
    format!("steam://url/CommunityFilePage/{number}")
}

/// Opens a mod's Workshop page in the Steam client, where the owner can subscribe: only a number a check named in this run.
pub fn open_in_steam(number: &str) -> Result<(), Failure> {
    let known = WORKSHOP.lock().map(|known| known.contains(number)).unwrap_or(false);
    if !workshop_number(number) || !known {
        return Err(Failure::refused("only a Workshop page the check named can be opened"));
    }
    let address = steam_page(number);
    #[cfg(target_os = "windows")]
    let started = std::process::Command::new("explorer").arg(&address).spawn();
    #[cfg(target_os = "macos")]
    let started = std::process::Command::new("open").arg(&address).spawn();
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let started = std::process::Command::new("xdg-open").arg(&address).spawn();
    started
        .map(|_| ())
        .map_err(|problem| Failure::refused(format!("Steam could not be asked to open the page: {problem}")))
}

#[cfg(test)]
#[path = "tests/mod_list_page.rs"]
mod tests;
