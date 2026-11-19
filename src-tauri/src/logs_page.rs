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
    Ok(LogReading { available: true, data: answer["data"].clone(), command_line })
}

#[cfg(test)]
#[path = "tests/logs_page.rs"]
mod tests;
