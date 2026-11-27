//! Kept answers and reading ahead (0.116.0; the owner's speed round of 28 Nov 2026, by card: "Remember answers", "Old at once,
//! then fresh" and "Yes, one at a time"). The slow page readings keep their last answer here, one small file each, so a page
//! shows it at once while it reads again; the window locks every button that changes something until the fresh answer lands.
//! Reading ahead is the window asking those readings by itself, one at a time behind anything the person asks, while its
//! setting is on (it starts on: it only reads). Nothing here is a record: the kit's `records` leaves the folder out (1.147.2).

use companion_core::checks;
use companion_core::failure::{Failure, FailureCode};
use companion_core::prefs;
use companion_core::time;
use serde::Serialize;
use serde_json::{Value, json};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};

pub const FOLDER: &str = "answers";
/// The readings whose answers are kept, by command: the slow ones a page opens with.
pub const KEPT: [&str; 6] =
    ["test_lists", "test_code", "mod_installs", "texture_status", "mod_settings", "mod_list_check"];
const FORMAT: u64 = 1;
const MAX_KEY_PARTS: usize = 3;
const SETTING_FILE: &str = "reading-ahead.json";
const SETTING_KEY: &str = "readAhead";

static NEXT: AtomicUsize = AtomicUsize::new(0);

/// A kept answer: when it was read, and the answer as the command gave it.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Kept {
    pub at: String,
    pub answer: Value,
}

/// Where a reading's answer is kept: one file per command and key (the game, and the repository or a variant where it has one).
pub fn file(data: &Path, command: &str, key: &[String]) -> Result<PathBuf, Failure> {
    if !KEPT.contains(&command) {
        return Err(Failure::refused(format!("{command} is not a reading whose answer is kept")));
    }
    if key.is_empty() || key.len() > MAX_KEY_PARTS || !key.iter().all(|part| checks::plain_name(part)) {
        return Err(Failure::refused("a kept answer is named by plain names only"));
    }
    Ok(data.join(FOLDER).join(command).join(format!("{}.json", key.join("--"))))
}

/// Keeps an answer, written whole beside its file and moved over it, so a reader never sees half of one.
pub fn keep<T: Serialize>(data: &Path, command: &str, key: &[String], answer: &T) -> Result<(), Failure> {
    let path = file(data, command, key)?;
    let failed =
        |problem: std::io::Error| Failure::new(FailureCode::WriteFailed, format!("{}: {problem}", path.display()));
    if let Some(folder) = path.parent() {
        fs::create_dir_all(folder).map_err(failed)?;
    }
    let bytes = serde_json::to_vec(&json!({"format": FORMAT, "at": time::now_utc(), "answer": answer}))
        .map_err(|problem| Failure::new(FailureCode::WriteFailed, problem.to_string()))?;
    let temporary = path.with_extension(format!("{}-{}.tmp", std::process::id(), NEXT.fetch_add(1, Ordering::SeqCst)));
    fs::write(&temporary, bytes).map_err(failed)?;
    fs::rename(&temporary, &path).map_err(|problem| {
        let _ = fs::remove_file(&temporary);
        failed(problem)
    })
}

/// The kept answer for a reading, or None when there is none or it cannot be read (it is only ever a head start).
pub fn read(data: &Path, command: &str, key: &[String]) -> Result<Option<Kept>, Failure> {
    let path = file(data, command, key)?;
    let Ok(Some(value)) = prefs::read_json(&path) else { return Ok(None) };
    if value["format"].as_u64() != Some(FORMAT) {
        return Ok(None);
    }
    match (value["at"].as_str(), value.get("answer")) {
        (Some(at), Some(answer)) => Ok(Some(Kept { at: at.to_owned(), answer: answer.clone() })),
        _ => Ok(None),
    }
}

/// Whether the window reads the slow pages ahead (default on: it only reads, so by the shared design rule it starts on).
pub fn reading_ahead_on(data: &Path) -> bool {
    match prefs::read_json(&data.join(SETTING_FILE)) {
        Ok(Some(value)) => value[SETTING_KEY].as_bool().unwrap_or(true),
        _ => true,
    }
}

/// Keeps the person's choice, written whole.
pub fn choose_reading_ahead(data: &Path, on: bool) -> Result<bool, Failure> {
    prefs::write_json(&data.join(SETTING_FILE), &json!({"version": 1, SETTING_KEY: on}))?;
    Ok(reading_ahead_on(data))
}

/// A reading asked ahead is refused while the setting is off: the window never asks one then, and the host holds it to that.
pub fn allowed_ahead(data: &Path, ahead: bool) -> Result<(), Failure> {
    if ahead && !reading_ahead_on(data) {
        return Err(Failure::refused("reading ahead is switched off in Settings"));
    }
    Ok(())
}

#[cfg(test)]
#[path = "tests/kept_answers.rs"]
mod tests;
