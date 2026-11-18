//! The program's own small files of the owner's choices (keyboard shortcuts, and whatever follows): read when there, written whole
//! through a file beside it and a rename, so a crash mid-write never leaves half a file.

use crate::failure::{Failure, FailureCode};
use serde_json::Value;
use std::fs;
use std::io::ErrorKind;
use std::path::Path;

/// The file's JSON, or None when it has not been written yet.
pub fn read_json(path: &Path) -> Result<Option<Value>, Failure> {
    match fs::read_to_string(path) {
        Ok(text) => serde_json::from_str(&text)
            .map(Some)
            .map_err(|problem| Failure::new(FailureCode::Unreadable, format!("{}: {problem}", path.display()))),
        Err(problem) if problem.kind() == ErrorKind::NotFound => Ok(None),
        Err(problem) => Err(Failure::new(FailureCode::Unreadable, format!("{}: {problem}", path.display()))),
    }
}

/// Writes the JSON whole: to a file beside it first, then renamed over it.
pub fn write_json(path: &Path, value: &Value) -> Result<(), Failure> {
    let failed =
        |problem: std::io::Error| Failure::new(FailureCode::WriteFailed, format!("{}: {problem}", path.display()));
    if let Some(folder) = path.parent() {
        fs::create_dir_all(folder).map_err(failed)?;
    }
    let text = serde_json::to_string_pretty(value)
        .map_err(|problem| Failure::new(FailureCode::WriteFailed, problem.to_string()))?;
    let temporary = path.with_extension("json.tmp");
    fs::write(&temporary, text + "\n").map_err(failed)?;
    fs::rename(&temporary, path).map_err(failed)
}

#[cfg(test)]
#[path = "tests/prefs.rs"]
mod tests;
