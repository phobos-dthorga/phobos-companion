//! Features for AI agent sessions (0.37.0; the owner, 20 Nov 2026: "Hidden unless switched on, or otherwise detected"): Something's
//! off, the Decisions page and the claims board serve people who work with agent sessions, and mean nothing to someone who doesn't.
//! They are shown when the person chose so, or, by default, when something on this PC shows agent sessions at work: a repository on
//! the games list carrying an agent's instructions or open decisions, or notes and answers already in the program's own folder.
//!
//! The choice is kept in `features.json` in the program's own folder, written whole (`prefs`).

use crate::failure::Failure;
use crate::prefs;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};

const FILE: &str = "features.json";
const KEY: &str = "agentFeatures";
const VERSION: u64 = 1;

/// What, in a repository, shows agent sessions work in it: their instructions, or a list of decisions they keep.
pub const REPOSITORY_SIGNS: [&str; 4] = ["AGENTS.md", "CLAUDE.md", ".claude", "config/decisions.json"];

/// What, in the program's own folder, shows they were used here before: screen notes and answered decisions.
pub const DATA_SIGNS: [&str; 2] = ["screen-notes", "decisions"];

/// Shown when found (the default), always, or never.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Choice {
    #[default]
    Found,
    On,
    Off,
}

impl Choice {
    pub fn from_word(word: &str) -> Option<Choice> {
        match word {
            "found" => Some(Choice::Found),
            "on" => Some(Choice::On),
            "off" => Some(Choice::Off),
            _ => None,
        }
    }
}

/// One thing that showed agent sessions at work: what it is, and the repository it is in (none for the program's own folder).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Sign {
    pub what: String,
    pub repository: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Status {
    pub choice: Choice,
    /// Whether the features are shown, from the choice and what was found.
    pub shown: bool,
    pub signs: Vec<Sign>,
}

/// What shows agent sessions at work: in each repository given (by its folder), then in the program's own folder.
pub fn signs(repositories: &[PathBuf], data: &Path) -> Vec<Sign> {
    let mut found = Vec::new();
    for repository in repositories {
        let name = repository.file_name().map(|n| n.to_string_lossy().into_owned());
        for what in REPOSITORY_SIGNS {
            if repository.join(what).exists() {
                found.push(Sign { what: what.to_string(), repository: name.clone() });
            }
        }
    }
    for what in DATA_SIGNS {
        if has_anything(&data.join(what)) {
            found.push(Sign { what: what.to_string(), repository: None });
        }
    }
    found
}

fn has_anything(folder: &Path) -> bool {
    fs::read_dir(folder).map(|mut entries| entries.next().is_some()).unwrap_or(false)
}

/// Whether the features are shown, for a choice and what was found.
pub fn shown(choice: Choice, signs: &[Sign]) -> bool {
    match choice {
        Choice::On => true,
        Choice::Off => false,
        Choice::Found => !signs.is_empty(),
    }
}

/// The choice kept in the program's folder; the default when none is kept, or the file can't be read (said nowhere: the default
/// is a safe answer, and the next choice writes the file whole).
pub fn chosen(data: &Path) -> Choice {
    prefs::read_json(&data.join(FILE))
        .ok()
        .flatten()
        .and_then(|value| value.get(KEY).and_then(|v| v.as_str()).and_then(Choice::from_word))
        .unwrap_or_default()
}

pub fn status(data: &Path, repositories: &[PathBuf]) -> Status {
    let choice = chosen(data);
    let signs = signs(repositories, data);
    Status { choice, shown: shown(choice, &signs), signs }
}

/// Keeps the person's choice, refusing any word but the three.
pub fn choose(data: &Path, word: &str, repositories: &[PathBuf]) -> Result<Status, Failure> {
    if Choice::from_word(word).is_none() {
        return Err(Failure::refused(format!("\"{word}\" is not a choice: found, on or off")));
    }
    let path = data.join(FILE);
    let mut kept = match prefs::read_json(&path) {
        Ok(Some(serde_json::Value::Object(map))) => map,
        _ => serde_json::Map::new(),
    };
    kept.insert("version".into(), json!(VERSION));
    kept.insert(KEY.into(), json!(word));
    prefs::write_json(&path, &serde_json::Value::Object(kept))?;
    Ok(status(data, repositories))
}

#[cfg(test)]
#[path = "tests/agents.rs"]
mod tests;
