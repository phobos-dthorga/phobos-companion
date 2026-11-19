//! A copy of this program's own records (the owner's go-ahead, 19 Nov 2026; `docs/later.md`, item 2): test verdicts, the history
//! log, "looked at" marks, screen notes, shortcuts and the central settings file, which live in the local application data that the
//! owner's NAS does not back up. The kit's `records status` says what would be copied, where to and how old the newest copy is;
//! `records backup` copies them into a new dated folder in the folder the owner chose (`recordsBackupPath`, on the Settings page),
//! only when the owner presses Back up now, and only while the kit's manifest still calls that report `writes`. Nothing is deleted.

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::kit::{self, Outcome};
use serde::Serialize;
use serde_json::Value;

const TOOL: &str = "records";
const STATUS: &str = "status";
const BACKUP: &str = "backup";

/// What a press of Back up now did.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct BackupResult {
    pub ok: bool,
    pub refusal: Option<String>,
    /// The copy just made: its path, name, files, bytes and time.
    pub copy: Value,
}

pub fn status_arguments() -> Vec<String> {
    // Full paths: the page shows where the copies go, and the owner may want to find them.
    Args::new(TOOL, STATUS).flag("--no-redact").json()
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

#[cfg(test)]
#[path = "tests/records_backup.rs"]
mod tests;
