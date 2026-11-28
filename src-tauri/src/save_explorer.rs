//! The Save explorer (0.121.0; the owner's question of 20 Nov 2026 and their card of 28 Nov 2026, "Save explorer, first slice";
//! `docs/save-explorer.md`): any save opened a part at a time, searched by name, kind or ID, and one thing in full with what
//! holds it and what it holds. The kit's save reports are found through the manifest's `save` surface (phobos-modkit 1.155.0);
//! the host names no game, and a game whose tools have none is told so.
//!
//! What may run, checked again at every request: every report this page runs only reads (the kit indexes a frozen copy of the
//! save in its own cache), and only while the manifest calls it `reads` with the surface. This is the first page that sends typed
//! words to a tool: a save's name, a part's path, a thing's ID and a search are each checked for shape here first, and the
//! search and the ID go after `--`, so nothing typed can be read as an option.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::kit;
use serde::Serialize;
use serde_json::Value;

const SURFACE: &str = "save";
const SCHEMA: &str = "schema";
const SEARCH: &str = "search";
const THING: &str = "thing";
const READS: &str = "reads";
/// Parts of the save a level lists at most (agent's choice: the owner's saves hold a few hundred element paths a level).
const PARTS: &str = "300";
/// Rows of each kind a search or a thing's values list.
const TOP: &str = "60";
const MAX_SAVE: usize = 120;
const MAX_PLACE: usize = 400;
const MAX_ID: usize = 120;

/// What the kit read, or word that this game's tools cannot read its saves.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct SaveReading {
    /// False when this game's tools have no save explorer.
    pub available: bool,
    pub report: Value,
    pub data: Value,
    pub command_line: String,
}

fn commands(manifest: &Value) -> &[Value] {
    manifest["data"]["commands"].as_array().map_or(&[], Vec::as_slice)
}

fn reports(command: &Value) -> &[Value] {
    command["reports"].as_array().map_or(&[], Vec::as_slice)
}

/// The kit command that reads this game's saves: the one whose `search` carries the surface.
pub fn tool_of(manifest: &Value, game: &str) -> Option<String> {
    commands(manifest)
        .iter()
        .filter(|c| c["game"].as_str() == Some(game))
        .find(|c| {
            reports(c).iter().any(|r| r["name"].as_str() == Some(SEARCH) && r["surface"].as_str() == Some(SURFACE))
        })
        .and_then(|c| c["name"].as_str().map(str::to_owned))
}

/// The saves' command, after checking the manifest still gives `report` the surface and calls it `reads`.
pub fn checked(manifest: &Value, game: &str, report: &str) -> Result<String, Failure> {
    let refused = || Failure::refused(format!("the tool kit offers no {report} for this game's saves"));
    let tool = tool_of(manifest, game).ok_or_else(refused)?;
    let command = commands(manifest).iter().find(|c| c["name"].as_str() == Some(tool.as_str())).ok_or_else(refused)?;
    let found = reports(command).iter().find(|r| r["name"].as_str() == Some(report)).ok_or_else(refused)?;
    if found["surface"].as_str() != Some(SURFACE) || found["effect"].as_str() != Some(READS) {
        return Err(Failure::refused(format!(
            "the tool kit now says {tool} {report} is {:?}, not what this page runs",
            found["effect"].as_str().unwrap_or_default()
        )));
    }
    Ok(tool)
}

/// A save's name as the game's save folder lists it (`PG16`, `Colony 1`): one line, never a path, never opening with a dash.
pub fn save_name(text: &str) -> bool {
    !text.is_empty()
        && text.chars().count() <= MAX_SAVE
        && !text.starts_with(['-', ' ', '.'])
        && !text.contains(['/', '\\', ':'])
        && !text.chars().any(char::is_control)
}

/// A part of a save by its element path (`savegame/game/maps/li`): plain names separated by `/`, as the kit counts them.
pub fn place(text: &str) -> bool {
    !text.is_empty()
        && text.len() <= MAX_PLACE
        && !text.starts_with(['/', '-', '.'])
        && !text.ends_with('/')
        && !text.contains("//")
        && text.bytes().all(|b| b.is_ascii_alphanumeric() || b"_-./".contains(&b))
}

/// A thing's ID as a save writes it (`Human200`, `VVE_Dirtbike30494987`): letters, digits, `_` and `-`.
pub fn thing_id(text: &str) -> bool {
    !text.is_empty()
        && text.len() <= MAX_ID
        && !text.starts_with('-')
        && text.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}

fn with_save(arguments: Args, save: Option<&str>) -> Result<Args, String> {
    match save {
        Some(name) if !save_name(name) => Err("that is not a save's name".to_owned()),
        Some(name) => Ok(arguments.given("--save", name)),
        None => Ok(arguments),
    }
}

/// The arguments that list one level of a save's parts (the top when no place is named).
pub fn schema_arguments(tool: &str, save: Option<&str>, under: Option<&str>) -> Result<Vec<String>, String> {
    let mut arguments = with_save(Args::new(tool, SCHEMA).pair("--depth", "1").pair("--top", PARTS), save)?;
    if let Some(path) = under {
        if !place(path) {
            return Err("that is not a part of a save".to_owned());
        }
        arguments = arguments.given("--under", path);
    }
    Ok(arguments.json())
}

/// The arguments that search a save; the words go last, after `--`.
pub fn search_arguments(tool: &str, save: Option<&str>, text: &str) -> Result<Vec<String>, String> {
    let text = checks::one_line(text);
    if !checks::search_pattern(&text) {
        return Err("a search needs a few words, on one line".to_owned());
    }
    Ok(with_save(Args::new(tool, SEARCH).pair("--top", TOP), save)?.flag("--json").flag("--").extend([text]).done())
}

/// The arguments that read one thing in full; the ID goes last, after `--`.
pub fn thing_arguments(tool: &str, save: Option<&str>, id: &str) -> Result<Vec<String>, String> {
    if !thing_id(id) {
        return Err("that is not a thing's ID".to_owned());
    }
    Ok(with_save(Args::new(tool, THING).pair("--top", "400"), save)?
        .flag("--json")
        .flag("--")
        .extend([id.to_owned()])
        .done())
}

fn command_line(arguments: &[String]) -> String {
    let shown: Vec<&str> = arguments.iter().map(String::as_str).filter(|a| *a != "--json").collect();
    format!("python -m phobos_modkit {}", shown.join(" "))
}

fn reading(arguments: Vec<String>, listener: Option<kit::Listener>) -> Result<SaveReading, Failure> {
    let answer = kit::run_hearing(&arguments[0], &arguments, listener)?;
    Ok(SaveReading {
        available: true,
        report: answer["report"].clone(),
        data: answer["data"].clone(),
        command_line: command_line(&arguments),
    })
}

/// What the page asks the kit for.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Ask {
    /// One level of the save's parts, under a place or from the top.
    Parts { under: Option<String> },
    /// Anything whose ID, kind or name matches.
    Search { text: String },
    /// One thing in full.
    Thing { id: String },
}

/// Reads what the page asked of a save (the newest when none is named); says when the game's tools cannot read its saves.
pub fn read(
    game: &str,
    save: Option<&str>,
    ask: &Ask,
    listener: Option<kit::Listener>,
) -> Result<SaveReading, Failure> {
    let manifest = kit::read_manifest()?;
    if tool_of(&manifest, game).is_none() {
        return Ok(SaveReading {
            available: false,
            report: Value::Null,
            data: Value::Null,
            command_line: String::new(),
        });
    }
    let arguments = match ask {
        Ask::Parts { under } => schema_arguments(&checked(&manifest, game, SCHEMA)?, save, under.as_deref()),
        Ask::Search { text } => search_arguments(&checked(&manifest, game, SEARCH)?, save, text),
        Ask::Thing { id } => thing_arguments(&checked(&manifest, game, THING)?, save, id),
    }
    .map_err(Failure::refused)?;
    reading(arguments, listener)
}

#[cfg(test)]
#[path = "tests/save_explorer.rs"]
mod tests;
