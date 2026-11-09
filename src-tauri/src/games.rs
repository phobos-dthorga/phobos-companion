//! The owner's list of games and their repositories. It holds personal paths, so it lives outside version control.

use crate::failure::{Failure, FailureCode};
use serde::Deserialize;
use std::collections::HashSet;
use std::env;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

const LIST_VARIABLE: &str = "PHOBOS_COMPANION_GAMES";
const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ListFile {
    schema_version: u32,
    root: Option<PathBuf>,
    games: Vec<ListedGame>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ListedGame {
    id: String,
    name: String,
    repositories: Vec<PathBuf>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Repository {
    pub name: String,
    pub path: PathBuf,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Game {
    pub id: String,
    pub name: String,
    pub repositories: Vec<Repository>,
}

/// The list's place: the variable if set, else `.local/games.json` in the folder the program was built from.
fn list_path() -> PathBuf {
    env::var_os(LIST_VARIABLE)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join(".local").join("games.json"))
}

/// The games on the list, or None when there is no list yet.
pub fn load() -> Result<Option<Vec<Game>>, Failure> {
    let path = list_path();
    let unreadable =
        |detail: String| Failure::new(FailureCode::ListUnreadable, format!("{}: {detail}", path.display()));
    match fs::read_to_string(&path) {
        Ok(text) => parse(&text).map(Some).map_err(unreadable),
        Err(problem) if problem.kind() == ErrorKind::NotFound => Ok(None),
        Err(problem) => Err(unreadable(problem.to_string())),
    }
}

fn parse(text: &str) -> Result<Vec<Game>, String> {
    let list: ListFile =
        serde_json::from_str(text.trim_start_matches('\u{feff}')).map_err(|problem| problem.to_string())?;
    if list.schema_version != SCHEMA_VERSION {
        return Err(format!("schema_version {} is not one this program knows", list.schema_version));
    }
    let root = list.root.unwrap_or_default();
    let mut seen = HashSet::new();
    let mut games = Vec::with_capacity(list.games.len());
    for game in list.games {
        if !seen.insert(game.id.clone()) {
            return Err(format!("the id {} is listed twice", game.id));
        }
        let repositories = game.repositories.iter().map(|path| repository(&root, path)).collect();
        games.push(Game { id: game.id, name: game.name, repositories });
    }
    Ok(games)
}

fn repository(root: &Path, path: &Path) -> Repository {
    let name = path.file_name().map_or_else(|| path.display().to_string(), |n| n.to_string_lossy().into_owned());
    Repository { name, path: root.join(path) }
}

#[cfg(test)]
#[path = "tests/games.rs"]
mod tests;
