//! The Game files page (the owner's go-ahead, 19 Nov 2026; `docs/later.md`, item 5): what a game itself writes and what Steam
//! records about it, from the kit's `game-files report`, for any Steam game. The game's places and Steam app ID come from its entry
//! in the owner's list when given, else the kit guesses them from its name. The page only reads; it can show a save or a screenshot
//! in the file manager, and only one inside a folder the last report named.

use crate::pictures;
use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games::{self, GamePlaces};
use companion_core::kit;
use serde_json::Value;
use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const TOOL: &str = "game-files";
const REPORT: &str = "report";
/// How far below a named folder a shown file may sit: a save in a group of saves (Saves/Sandbox/<save>) is two down.
const DEPTH: usize = 2;

/// The folders the last report named, which the page may show files from.
static SHOWN_FROM: Mutex<Vec<PathBuf>> = Mutex::new(Vec::new());

pub fn arguments(game: &GamePlaces, since: Option<&str>) -> Vec<String> {
    let mut arguments = Args::new(TOOL, REPORT).given("--name", &game.name);
    if let Some(app_id) = game.steam_app_id {
        arguments = arguments.given("--app-id", &app_id.to_string());
    }
    for kind in games::PLACE_KINDS {
        if let Some(place) = game.places.get(kind) {
            arguments = arguments.path(&format!("--{kind}"), place);
        }
    }
    if let Some(since) = since {
        arguments = arguments.given("--since", since);
    }
    arguments.flag("--no-redact").json()
}

/// The folders a report named: its data folder, saves folder and screenshot folders.
pub fn named_folders(data: &Value) -> Vec<PathBuf> {
    let places = &data["places"];
    let mut found: Vec<PathBuf> =
        ["data", "saves"].iter().filter_map(|kind| places[kind].as_str()).map(PathBuf::from).collect();
    found.extend(
        places["screenshots"]
            .as_array()
            .map_or(&[][..], Vec::as_slice)
            .iter()
            .filter_map(Value::as_str)
            .map(PathBuf::from),
    );
    found
}

/// Whether a file sits inside one of the folders, at most `DEPTH` levels down.
pub fn inside(path: &Path, folders: &[PathBuf]) -> bool {
    let mut parent = path.parent();
    for _ in 0..DEPTH {
        let Some(folder) = parent else { return false };
        if folders.iter().any(|named| named == folder) {
            return true;
        }
        parent = folder.parent();
    }
    false
}

/// "Since the launch before the last" (phobos-modkit 1.51.0): while the game runs, Steam's last launch is this one.
pub const PREVIOUS: &str = "previous";

/// The game's report. `since` is a moment (2026-11-19, or with a time), or `previous`; None means since the last launch.
pub fn read(game: &str, since: Option<String>) -> Result<Value, Failure> {
    if !checks::plain_name(game) {
        return Err(Failure::refused("that is not a game's id"));
    }
    if let Some(since) = &since
        && since != PREVIOUS
        && !checks::moment(since)
    {
        return Err(Failure::refused("that is not a moment"));
    }
    let places = games::places_of(game)?.ok_or_else(|| Failure::refused(format!("{game} is not on the list")))?;
    let data = kit::run(TOOL, &arguments(&places, since.as_deref()))?["data"].clone();
    if let Ok(mut shown) = SHOWN_FROM.lock() {
        *shown = named_folders(&data);
    }
    remember_shots(listed_shots(&data["screenshots"]["list"]), Vec::new());
    Ok(data)
}

/// Shows a save or a screenshot in the file manager, selected; only one inside a folder the last report named.
pub fn show(path: &str) -> Result<(), Failure> {
    let path = PathBuf::from(path);
    let allowed = SHOWN_FROM.lock().map(|shown| inside(&path, &shown)).unwrap_or(false);
    if !allowed || !path.exists() {
        return Err(Failure::refused("only a save or a screenshot this page listed can be shown"));
    }
    pictures::select_in_file_manager(&path)
}

// ---------------------------------------------------------------- screenshots, seen (0.32.0)

const SCREENSHOTS: &str = "screenshots";
/// The picture kinds the window may be handed, as the kit lists them.
const PICTURES: [&str; 5] = ["png", "jpg", "jpeg", "bmp", "webp"];
/// The largest screenshot handed to the window whole (agent default): the owner's are 1.5 MB on average.
pub const MAX_SHOT_BYTES: u64 = 64 * 1024 * 1024;

/// Every screenshot a report or a screenshots list named in this run: the only files `shot` hands over.
static SHOT_FILES: Mutex<BTreeSet<PathBuf>> = Mutex::new(BTreeSet::new());

pub fn shot_arguments(game: &GamePlaces) -> Vec<String> {
    let mut arguments = Args::new(TOOL, SCREENSHOTS).given("--name", &game.name);
    if let Some(app_id) = game.steam_app_id {
        arguments = arguments.given("--app-id", &app_id.to_string());
    }
    for kind in ["data", "screenshots"] {
        if let Some(place) = game.places.get(kind) {
            arguments = arguments.path(&format!("--{kind}"), place);
        }
    }
    arguments.flag("--no-redact").json()
}

/// The paths of the pictures a list holds (the kit's `list`, each with `path`).
pub fn listed_shots(list: &Value) -> Vec<PathBuf> {
    list.as_array()
        .map_or(&[][..], Vec::as_slice)
        .iter()
        .filter_map(|shot| shot["path"].as_str())
        .map(PathBuf::from)
        .collect()
}

fn remember_shots(paths: Vec<PathBuf>, folders: Vec<PathBuf>) {
    if let Ok(mut known) = SHOT_FILES.lock() {
        known.extend(paths);
    }
    if let Ok(mut shown) = SHOWN_FROM.lock() {
        for folder in folders {
            if !shown.contains(&folder) {
                shown.push(folder);
            }
        }
    }
}

/// One game's screenshots alone (phobos-modkit 1.59.0), for the Timeline's gallery; they may then be seen and shown in folder.
pub fn screenshots(game: &str) -> Result<Value, Failure> {
    if !checks::plain_name(game) {
        return Err(Failure::refused("that is not a game's id"));
    }
    let places = games::places_of(game)?.ok_or_else(|| Failure::refused(format!("{game} is not on the list")))?;
    let data = kit::run(TOOL, &shot_arguments(&places))?["data"].clone();
    let folders =
        data["folders"].as_array().map_or(&[][..], Vec::as_slice).iter().filter_map(Value::as_str).map(PathBuf::from);
    remember_shots(listed_shots(&data["list"]), folders.collect());
    Ok(data)
}

/// Whether a path is a picture by its extension.
pub fn is_picture(path: &Path) -> bool {
    path.extension().and_then(|e| e.to_str()).is_some_and(|e| PICTURES.contains(&e.to_ascii_lowercase().as_str()))
}

/// One screenshot's bytes, for the window to draw small: only a picture a list in this run named, of a sane size.
pub fn shot(path: &str) -> Result<Vec<u8>, Failure> {
    let path = PathBuf::from(path);
    let known = SHOT_FILES.lock().map(|known| known.contains(&path)).unwrap_or(false);
    if !known || !is_picture(&path) {
        return Err(Failure::refused("only a screenshot a list named can be shown"));
    }
    let unreadable = |problem: std::io::Error| Failure::refused(format!("{}: {problem}", path.display()));
    let size = std::fs::metadata(&path).map_err(unreadable)?.len();
    if size > MAX_SHOT_BYTES {
        return Err(Failure::refused(format!("{} is too large to show here", path.display())));
    }
    std::fs::read(&path).map_err(unreadable)
}

#[cfg(test)]
#[path = "tests/game_files_page.rs"]
mod tests;
