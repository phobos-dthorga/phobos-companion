//! Saved lists on the Mod list page (0.48.0; the owner, 22 Nov 2026: "Start step 4, saved lists"). The owner's choices on question
//! cards: lists saved by name, kept at each game start, each save's own and RimSort's history, and files; loading **shows the
//! difference, then a yes**; mods not on this PC are left out, named with why, and offered in Steam.
//!
//! The kit's `mod-list lists` names every list; `compare` only reads; `load`, `save`, `forget` and `export` write, each only on the
//! owner's press and while the manifest calls it `writes`. The host accepts only a list the last listing named, or a file the
//! owner chose in the Open dialog the host itself showed; it writes a list file only where the owner chose in the Save dialog.
//! **Find on the Workshop** opens the Steam client's Workshop search for a missing mod's name.

use crate::mod_list_page::{
    TOOL, WORKSHOP, hand_to_steam, known_list, named, places, result_of, sane_text, workshop_number,
};
use crate::pick::{self, Filter};
use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::games::GamePlaces;
use companion_core::kit::{self, allowed_by_manifest};
use serde_json::Value;
use std::collections::BTreeSet;
use std::path::Path;
use std::sync::Mutex;
use tauri::AppHandle;

use crate::mod_list_page::ChangeResult;

const LISTS: &str = "lists";
const COMPARE: &str = "compare";
const LOAD: &str = "load";
const SAVE: &str = "save";
const FORGET: &str = "forget";
const EXPORT: &str = "export";
/// Where a list comes from, as the kit names them; "file" is a file the owner chose in the Open dialog.
pub const SOURCES: [&str; 4] = ["saved", "kept", "save", "manager"];
pub const FILE: &str = "file";
/// The longest name a list is saved by (the kit's own limit).
pub const MAX_NAME: usize = 80;
/// The longest mod name a Workshop search carries.
pub const MAX_SEARCH: usize = 120;
const OPEN_FILTER: Filter = Filter { name: "Mod lists", extensions: &["rml", "rws", "xml", "json"] };
const SAVE_FILTER: Filter = Filter { name: "RimWorld mod lists", extensions: &["rml"] };

/// (game, source, ref) of every list the last listing named: the only lists the page may compare, load or take away.
static KNOWN: Mutex<BTreeSet<(String, String, String)>> = Mutex::new(BTreeSet::new());
/// (game, path) of every file the owner chose in the Open dialog in this run.
static FILES: Mutex<BTreeSet<(String, String)>> = Mutex::new(BTreeSet::new());

/// The lists a listing names, for the checks on later presses.
pub fn named_by(game: &str, data: &Value) -> Vec<(String, String, String)> {
    let mut found = Vec::new();
    for source in SOURCES {
        for list in data["sources"][source].as_array().map_or(&[][..], Vec::as_slice) {
            if let Some(reference) = list["ref"].as_str() {
                found.push((game.to_owned(), source.to_owned(), reference.to_owned()));
            }
        }
    }
    found
}

/// Every list on offer for a game, by source. Only reads (and, as every read of the list does, keeps a copy at a game start).
pub fn lists(game: &str, listener: Option<kit::Listener>) -> Result<Value, Failure> {
    let found = places(game)?;
    let arguments = named(Args::new(TOOL, LISTS), &found).flag("--no-redact").json();
    let data = kit::run_hearing(TOOL, &arguments, listener)?["data"].clone();
    if let Ok(mut known) = KNOWN.lock() {
        known.retain(|(g, ..)| g != game);
        known.extend(named_by(game, &data));
    }
    Ok(data)
}

/// The arguments naming one list: `--from SOURCE:REF`, or `--file PATH` for a chosen file.
pub fn chosen_arguments(arguments: Args, source: &str, reference: &str) -> Args {
    if source == FILE {
        arguments.path("--file", Path::new(reference))
    } else {
        arguments.given("--from", &format!("{source}:{reference}"))
    }
}

fn known_choice(game: &str, source: &str, reference: &str) -> bool {
    if !sane_text(reference) {
        return false;
    }
    if source == FILE {
        return FILES.lock().map(|files| files.contains(&(game.to_owned(), reference.to_owned()))).unwrap_or(false);
    }
    SOURCES.contains(&source)
        && KNOWN
            .lock()
            .map(|known| known.contains(&(game.to_owned(), source.to_owned(), reference.to_owned())))
            .unwrap_or(false)
}

pub fn compare_arguments(game: &GamePlaces, list: &str, source: &str, reference: &str, apply: bool) -> Vec<String> {
    let arguments = named(Args::new(TOOL, if apply { LOAD } else { COMPARE }), game).given("--list", list);
    let arguments = chosen_arguments(arguments, source, reference);
    let arguments = if apply { arguments.flag("--apply") } else { arguments };
    arguments.flag("--no-redact").json()
}

/// What loading a list would change, or (`apply`, the owner's press of Use this list) loading it after a backup.
pub fn compare(
    game: &str,
    list: &str,
    source: &str,
    reference: &str,
    apply: bool,
    listener: Option<kit::Listener>,
) -> Result<ChangeResult, Failure> {
    let found = places(game)?;
    if !known_list(game, list) || !known_choice(game, source, reference) {
        return Err(Failure::refused(
            "only a list the last listing named, or a file you chose, can be loaded: read again",
        ));
    }
    if apply {
        allowed_by_manifest(&kit::read_manifest()?, TOOL, LOAD).map_err(Failure::refused)?;
    }
    let result =
        result_of(&kit::run_hearing(TOOL, &compare_arguments(&found, list, source, reference, apply), listener)?);
    let numbers: Vec<String> = result.data["missing"]
        .as_array()
        .map_or(&[][..], Vec::as_slice)
        .iter()
        .filter_map(|m| m["workshop_id"].as_str())
        .filter(|n| workshop_number(n))
        .map(str::to_owned)
        .collect();
    if let Ok(mut known) = WORKSHOP.lock() {
        known.extend(numbers);
    }
    Ok(result)
}

/// The Open dialog for a list file; the path chosen is remembered so it may be compared and loaded. None when closed.
pub fn open_file(app: &AppHandle, game: &str, title: &str) -> Result<Option<String>, Failure> {
    places(game)?;
    let Some(path) = pick::open_file(app, title, &OPEN_FILTER)? else {
        return Ok(None);
    };
    let path = path.to_string_lossy().into_owned();
    if let Ok(mut files) = FILES.lock() {
        files.insert((game.to_owned(), path.clone()));
    }
    Ok(Some(path))
}

/// A list's name as the owner gave it: one line of 1 to 80 letters.
pub fn sane_name(name: &str) -> bool {
    let trimmed = name.trim();
    !trimmed.is_empty() && trimmed.chars().count() <= MAX_NAME && sane_text(trimmed)
}

pub fn save_arguments(game: &GamePlaces, list: &str, name: &str, replace: bool) -> Vec<String> {
    let arguments = named(Args::new(TOOL, SAVE), game).given("--list", list).given("--as", name.trim());
    let arguments = if replace { arguments.flag("--replace") } else { arguments };
    arguments.flag("--apply").flag("--no-redact").json()
}

/// Keeps the list as it stands, by name (`replace` only on the owner's second press, when the name is in use).
pub fn save(game: &str, list: &str, name: &str, replace: bool) -> Result<ChangeResult, Failure> {
    let found = places(game)?;
    if !known_list(game, list) || !sane_name(name) {
        return Err(Failure::refused("give the list a name of 1 to 80 letters, on one line"));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, SAVE).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &save_arguments(&found, list, name, replace), None)?))
}

pub fn forget_arguments(game: &GamePlaces, reference: &str) -> Vec<String> {
    named(Args::new(TOOL, FORGET), game).given("--saved", reference).flag("--apply").flag("--no-redact").json()
}

/// Takes away a list saved by name: only one the last listing named.
pub fn forget(game: &str, reference: &str) -> Result<ChangeResult, Failure> {
    let found = places(game)?;
    if !known_choice(game, "saved", reference) {
        return Err(Failure::refused("only a list saved by name, as the last listing named it, can be taken away"));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, FORGET).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &forget_arguments(&found, reference), None)?))
}

pub fn export_arguments(game: &GamePlaces, list: &str, chosen: Option<(&str, &str)>, target: &str) -> Vec<String> {
    let arguments = named(Args::new(TOOL, EXPORT), game).given("--list", list);
    let arguments = match chosen {
        Some((source, reference)) => arguments.given("--from", &format!("{source}:{reference}")),
        None => arguments,
    };
    arguments.path("--to", Path::new(target)).flag("--apply").flag("--no-redact").json()
}

/// A file name offered in the Save dialog: the list's name, kept to letters, digits, spaces, dots, dashes and underscores.
pub fn offered_name(label: &str) -> String {
    let kept: String =
        label.chars().map(|c| if c.is_alphanumeric() || " ._-".contains(c) { c } else { '-' }).take(MAX_NAME).collect();
    let kept = kept.trim_matches([' ', '.', '-']).to_owned();
    format!("{}.rml", if kept.is_empty() { "Mod list" } else { &kept })
}

/// Writes a list (the game's own, or one the last listing named) as the game's own list file, where the owner chooses in the Save
/// dialog. None when the dialog is closed.
pub fn export(
    app: &AppHandle,
    game: &str,
    list: &str,
    chosen: Option<(String, String)>,
    label: &str,
    title: &str,
) -> Result<Option<ChangeResult>, Failure> {
    let found = places(game)?;
    if !known_list(game, list) || chosen.as_ref().is_some_and(|(s, r)| s == FILE || !known_choice(game, s, r)) {
        return Err(Failure::refused("only the game's list or one the last listing named can be written out"));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, EXPORT).map_err(Failure::refused)?;
    let Some(target) = pick::save_file(app, title, &offered_name(label), &SAVE_FILTER)? else {
        return Ok(None);
    };
    let target = target.to_string_lossy().into_owned();
    let chosen = chosen.as_ref().map(|(s, r)| (s.as_str(), r.as_str()));
    Ok(Some(result_of(&kit::run_hearing(TOOL, &export_arguments(&found, list, chosen, &target), None)?)))
}

/// A Workshop search address in the Steam client, for a mod's name.
pub fn workshop_search(app_id: u32, name: &str) -> String {
    let mut encoded = String::new();
    for byte in name.trim().bytes() {
        if byte.is_ascii_alphanumeric() || b"-_.~".contains(&byte) {
            encoded.push(char::from(byte));
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    format!("steam://openurl/https://steamcommunity.com/workshop/browse/?appid={app_id}&searchtext={encoded}")
}

/// Opens the Steam client's Workshop search for a mod a list names that is not on this PC.
pub fn find_on_workshop(game: &str, name: &str) -> Result<(), Failure> {
    let found = places(game)?;
    if !sane_text(name) || name.chars().count() > MAX_SEARCH {
        return Err(Failure::refused("that is not a mod's name"));
    }
    let Some(app_id) = found.steam_app_id else {
        return Err(Failure::refused("this game has no Steam Workshop the tools know of"));
    };
    hand_to_steam(&workshop_search(app_id, name))
}

#[cfg(test)]
#[path = "tests/mod_list_lists.rs"]
mod tests;
