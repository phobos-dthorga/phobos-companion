//! A copy of this program's own records (the owner's go-ahead, 19 Nov 2026; `docs/later.md`, item 2): test verdicts, the history
//! log, "looked at" marks, screen notes, shortcuts and the central settings file, which live in the local application data that the
//! owner's NAS does not back up. The kit's `records status` says what would be copied, where to and how old the newest copy is;
//! `records backup` copies them into a new dated folder in the folder the owner chose (`recordsBackupPath`, on the Settings page),
//! when the owner presses Back up now, and only while the kit's manifest still calls that report `writes`. Nothing is deleted.
//!
//! **It also copies by itself** (0.29.0; owner, 20 Nov 2026: "every few hours when it's open, and if the schedule is missed, the
//! soonest next opportunity should then arise"): while the program is open, a timer asks the kit every few minutes whether a copy is
//! due (`status --every-hours`), and makes one when it is (`backup --automatic`). A copy missed while the program was closed or the
//! PC slept is due at the next look, so it is made within minutes of opening or waking. A folder that cannot be reached (a NAS
//! asleep) is kept as the last attempt for the window to show, and tried again at the next look.

use std::sync::Mutex;
use std::time::Duration;

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::kit::{self, Outcome};
use companion_core::time::now_utc;
use serde::Serialize;
use serde_json::Value;

const TOOL: &str = "records";
const STATUS: &str = "status";
const BACKUP: &str = "backup";

/// How old the newest copy may be before the timer makes another (agent default, for the owner's "every few hours").
pub const EVERY_HOURS: u32 = 6;
/// How often the timer looks. Short, so a missed copy is made soon after the program opens or the PC wakes (agent default).
pub const LOOK_EVERY: Duration = Duration::from_secs(10 * 60);
/// The first look waits this long after the program opens, so starting it stays quick (agent default).
pub const FIRST_LOOK: Duration = Duration::from_secs(20);

/// What a press of Back up now did.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct BackupResult {
    pub ok: bool,
    pub refusal: Option<String>,
    /// The copy just made: its path, name, files, bytes and time.
    pub copy: Value,
}

pub fn status_arguments() -> Vec<String> {
    // Full paths: the page shows where the copies go, and the owner may want to find them. The timer's figure, so the page says
    // how often the copies are made and whether one is due from the same rule the timer follows.
    Args::new(TOOL, STATUS).pair("--every-hours", &EVERY_HOURS.to_string()).flag("--no-redact").json()
}

pub fn backup_arguments() -> Vec<String> {
    Args::new(TOOL, BACKUP).flag("--no-redact").json()
}

/// What would be copied, where to, and the copies already there, as the kit says.
pub fn status() -> Result<Value, Failure> {
    Ok(kit::run(TOOL, &status_arguments())?["data"].clone())
}

/// Copies the records into a new dated folder.
pub fn backup() -> Result<BackupResult, Failure> {
    kit::allowed_by_manifest(&kit::read_manifest()?, TOOL, BACKUP).map_err(Failure::refused)?;
    let answer = kit::run(TOOL, &backup_arguments())?;
    Ok(result_of(&answer))
}

fn result_of(answer: &Value) -> BackupResult {
    let outcome = Outcome::of(answer);
    BackupResult { ok: outcome.ok, refusal: outcome.refusal, copy: answer["data"]["copy"].clone() }
}

/// The last automatic attempt this run of the program made: when, and what happened.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Automatic {
    /// When it was tried, in UTC.
    pub time: String,
    pub ok: bool,
    /// Why it made no copy, in words: the folder could not be reached, the tools failed.
    pub refusal: Option<String>,
    /// The copy made, as Back up now gives it.
    pub copy: Value,
}

static LAST: Mutex<Option<Automatic>> = Mutex::new(None);

/// The last automatic attempt, or none yet in this run.
pub fn last_automatic() -> Option<Automatic> {
    LAST.lock().map(|last| last.clone()).unwrap_or(None)
}

pub fn automatic_arguments() -> Vec<String> {
    Args::new(TOOL, BACKUP).flag("--automatic").flag("--no-redact").json()
}

/// Whether the kit's status says a copy is due. A kit too old to know (no `due`) never is.
pub fn is_due(status: &Value) -> bool {
    status["due"].as_bool().unwrap_or(false)
}

/// One look: makes a copy when one is due. Returns the attempt, or none when nothing was due or no folder is chosen.
pub fn look() -> Option<Automatic> {
    let attempt = match kit::run(TOOL, &status_arguments()) {
        Ok(answer) if !is_due(&answer["data"]) => return None,
        Ok(_) => kit::read_manifest()
            .and_then(|manifest| kit::allowed_by_manifest(&manifest, TOOL, BACKUP).map_err(Failure::refused))
            .and_then(|()| kit::run(TOOL, &automatic_arguments())),
        Err(failure) => Err(failure),
    };
    let made = match attempt {
        Ok(answer) => {
            let result = result_of(&answer);
            Automatic { time: now_utc(), ok: result.ok, refusal: result.refusal, copy: result.copy }
        }
        Err(failure) => Automatic { time: now_utc(), ok: false, refusal: Some(failure.detail), copy: Value::Null },
    };
    if let Ok(mut last) = LAST.lock() {
        *last = Some(made.clone());
    }
    Some(made)
}

/// Starts the timer on a thread of its own, for as long as the program runs. The window reads each attempt with
/// `last_automatic`.
pub fn start() {
    std::thread::spawn(|| {
        std::thread::sleep(FIRST_LOOK);
        loop {
            look();
            std::thread::sleep(LOOK_EVERY);
        }
    });
}

#[cfg(test)]
#[path = "tests/records_backup.rs"]
mod tests;
