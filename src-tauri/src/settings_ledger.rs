//! Settings to look at (the owner's request, 19 Nov 2026): every setting a game's mods ever added, removed or gave a new default,
//! from the kit's `installs settings` (which runs the repository's own `settingsHistory` command and only reads), and the owner's
//! "Looked at" marks. The marks are the only thing written, a line each appended to a file in this program's own folder, one per
//! repository (`settings-seen/<repository>.jsonl`); the last line for a setting decides. Nothing in a repository or a game changes.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::{Failure, FailureCode};
use companion_core::games;
use companion_core::kit::{self, Outcome};
use serde::Serialize;
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

const TOOL: &str = "installs";
const FOLDER: &str = "settings-seen";
const CONFIG: [&str; 2] = ["config", "installs.json"];
const LINE_FORMAT: u32 = 1;
const MAX_ID: usize = 400;
const MAX_IDS: usize = 2000;

/// One repository's settings history, newest first, with the settings the owner has marked as looked at.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Ledger {
    pub repository: String,
    /// The kit's settings, newest first; each names its mod, key, label, what changed and when.
    pub settings: Value,
    /// The ids the owner marked as looked at and has not unmarked since.
    pub seen: Vec<String>,
}

pub fn arguments(root: &Path) -> Vec<String> {
    Args::new(TOOL, "settings").root(root).json()
}

/// The marks file for a repository, in this program's own data folder.
pub fn seen_file(data: &Path, repository: &str) -> PathBuf {
    data.join(FOLDER).join(format!("{repository}.jsonl"))
}

/// Every repository of the game that can say its settings' history, with the owner's marks. A repository that cannot is left out.
pub fn read(game: &str, data: &Path, listener: Option<kit::Listener>) -> Result<Vec<Ledger>, Failure> {
    let mut found = Vec::new();
    for repository in games::repositories_of(game)? {
        if !repository.path.join(CONFIG[0]).join(CONFIG[1]).is_file() {
            continue;
        }
        let answer = kit::run_hearing(TOOL, &arguments(&repository.path), listener)?;
        if !Outcome::of(&answer).ok {
            continue;
        }
        let seen = seen_ids(&fs::read_to_string(seen_file(data, &repository.name)).unwrap_or_default());
        found.push(Ledger { repository: repository.name, settings: answer["data"]["settings"].clone(), seen });
    }
    Ok(found)
}

/// The ids still marked, from the marks file's lines: the last line for an id decides; a line that cannot be read is skipped.
pub fn seen_ids(text: &str) -> Vec<String> {
    let mut last: BTreeMap<String, bool> = BTreeMap::new();
    for line in text.lines() {
        let Ok(value) = serde_json::from_str::<Value>(line) else { continue };
        if let (Some(id), Some(seen)) = (value["id"].as_str(), value["seen"].as_bool()) {
            last.insert(id.to_owned(), seen);
        }
    }
    last.into_iter().filter(|(_, seen)| *seen).map(|(id, _)| id).collect()
}

/// The lines that mark these settings as looked at (or not), or why they are refused.
pub fn mark_lines(ids: &[String], seen: bool, time: &str) -> Result<Vec<String>, String> {
    if ids.is_empty() || ids.len() > MAX_IDS {
        return Err(format!("mark between 1 and {MAX_IDS} settings at once"));
    }
    ids.iter()
        .map(|id| {
            if id.is_empty() || id.chars().count() > MAX_ID || checks::one_line(id) != *id {
                return Err(format!("{id:?} is not a setting's id"));
            }
            Ok(json!({"format": LINE_FORMAT, "id": id, "seen": seen, "time": time}).to_string())
        })
        .collect()
}

/// Records the owner's marks for one repository's settings; the time they were written.
pub fn mark(game: &str, repository: &str, ids: &[String], seen: bool, data: &Path) -> Result<String, Failure> {
    games::named_repository(game, repository)?;
    let time = companion_core::time::now_utc();
    let lines = mark_lines(ids, seen, &time).map_err(Failure::refused)?;
    let file = seen_file(data, repository);
    append(&file, &lines)
        .map_err(|problem| Failure::new(FailureCode::WriteFailed, format!("{}: {problem}", file.display())))?;
    Ok(time)
}

fn append(file: &Path, lines: &[String]) -> std::io::Result<()> {
    if let Some(folder) = file.parent() {
        fs::create_dir_all(folder)?;
    }
    let mut handle = OpenOptions::new().create(true).append(true).open(file)?;
    for line in lines {
        handle.write_all(line.as_bytes())?;
        handle.write_all(b"\n")?;
    }
    Ok(())
}

#[cfg(test)]
#[path = "tests/settings_ledger.rs"]
mod tests;
