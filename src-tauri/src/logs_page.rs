//! The Logs page: a game's log, grouped and compared with the run before, by whichever of the kit's tools the manifest marks as
//! that game's log reader (surface `log`). The host names no game: a game whose tools have no log reader is told so in words.
//!
//! The reader must only read, need nothing typed, and offer `--json` and `--brief` (kit 1.35.0), so the page gets a page's worth
//! (about 300 KB) rather than every line of a log of hundreds of thousands.

use crate::reports;
use companion_core::failure::Failure;
use companion_core::kit;
use serde::Serialize;
use serde_json::Value;
use std::sync::Mutex;

/// The faults each game's last reading named (0.71.0): Explain this fault asks about one by its id, and the host takes its text from
/// here, so the window can never put words of its own into what an AI service is sent.
static SEEN: Mutex<Vec<(String, Value)>> = Mutex::new(Vec::new());
const MAX_ID: usize = 80;

const LOG_SURFACE: &str = "log";
const BRIEF_OPTION: &str = "--brief";
/// How many signatures the page can page through: every error and warning of a bad session, about 1 MB of answer.
const SIGNATURES_SHOWN: u32 = 500;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct LogReading {
    /// False when this game's tools have no log reader yet.
    pub available: bool,
    pub data: Value,
    pub command_line: String,
}

/// The arguments that read the game's log, and the same as a person would type them; None when the game has no log reader.
pub fn plan(manifest: &Value, game: &str) -> Result<Option<(Vec<String>, String)>, Failure> {
    let Some(entry) = reports::entries(manifest, game).into_iter().find(|e| e.surface.as_deref() == Some(LOG_SURFACE))
    else {
        return Ok(None);
    };
    let options = reports::find_runnable(manifest, game, &entry.command, entry.report.as_deref())?;
    if reports::option(options, BRIEF_OPTION).is_none() {
        return Err(Failure::refused(format!(
            "{} has no {BRIEF_OPTION}: the tool kit needs updating to 1.35.0 or later",
            entry.command
        )));
    }
    let mut arguments = reports::arguments(&entry.command, entry.report.as_deref(), options, SIGNATURES_SHOWN);
    arguments.push(BRIEF_OPTION.to_owned());
    let command_line = reports::command_line(&entry.command, entry.report.as_deref(), options, SIGNATURES_SHOWN);
    Ok(Some((arguments, command_line)))
}

/// Reads the game's log through its tools, or says the game has no log reader yet.
pub fn read(game: &str, listener: Option<kit::Listener>) -> Result<LogReading, Failure> {
    let manifest = kit::read_manifest()?;
    let Some((arguments, command_line)) = plan(&manifest, game)? else {
        return Ok(LogReading { available: false, data: Value::Null, command_line: String::new() });
    };
    let command = arguments[0].clone();
    let answer = kit::run_hearing(&command, &arguments, listener)?;
    remember(game, &answer["data"]);
    Ok(LogReading { available: true, data: answer["data"].clone(), command_line })
}

/// Keeps a game's faults from its latest reading, in place of the last.
pub fn remember(game: &str, data: &Value) {
    if let Ok(mut seen) = SEEN.lock() {
        seen.retain(|(g, _)| g != game);
        for group in data["groups"].as_array().map_or(&[][..], Vec::as_slice) {
            seen.push((game.to_owned(), group.clone()));
        }
    }
}

/// One fault the game's latest reading named, by its id.
pub fn remembered(game: &str, id: &str) -> Result<Value, Failure> {
    if id.is_empty() || id.len() > MAX_ID || id.chars().any(char::is_control) {
        return Err(Failure::refused("that is not a fault's id"));
    }
    SEEN.lock()
        .ok()
        .and_then(|seen| {
            seen.iter().find(|(g, group)| g == game && group["id"].as_str() == Some(id)).map(|(_, group)| group.clone())
        })
        .ok_or_else(|| Failure::refused("that fault is not in the log as last read: read the log again"))
}

#[cfg(test)]
#[path = "tests/logs_page.rs"]
mod tests;
