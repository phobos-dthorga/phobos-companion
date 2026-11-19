//! The owner's list of games and their repositories. It holds personal paths, so it lives outside version control.

use crate::failure::{Failure, FailureCode};
use serde::Deserialize;
use std::collections::{BTreeMap, HashSet};
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
    /// The game's Steam app ID, when its name is not enough to find it (0.22.0).
    #[serde(default)]
    steam_app_id: Option<u32>,
    /// Where the game keeps its files, by kind, when a guess from its name would miss them (0.22.0).
    #[serde(default)]
    places: BTreeMap<String, PathBuf>,
}

/// The kinds of place a game's entry may name (0.22.0; `docs/later.md`, item 5).
pub const PLACE_KINDS: [&str; 3] = ["data", "saves", "screenshots"];

/// Where a game keeps its files and how Steam knows it, as the owner's list gives them; empty when the list says nothing.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct GamePlaces {
    pub name: String,
    pub steam_app_id: Option<u32>,
    pub places: BTreeMap<String, PathBuf>,
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
        .unwrap_or_else(|| crate::repository_root().join(".local").join("games.json"))
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

/// One game on the owner's list, or None when it is not there (or there is no list).
/// A listed game's places and Steam app ID; None when the game is not on the list. A place of a kind no page reads is refused.
pub fn places_of(id: &str) -> Result<Option<GamePlaces>, Failure> {
    let path = list_path();
    let unreadable =
        |detail: String| Failure::new(FailureCode::ListUnreadable, format!("{}: {detail}", path.display()));
    let text = match fs::read_to_string(&path) {
        Ok(text) => text,
        Err(problem) if problem.kind() == ErrorKind::NotFound => return Ok(None),
        Err(problem) => return Err(unreadable(problem.to_string())),
    };
    places_in(&text, id).map_err(unreadable)
}

/// `places_of`, from the list's text.
fn places_in(text: &str, id: &str) -> Result<Option<GamePlaces>, String> {
    let list: ListFile =
        serde_json::from_str(text.trim_start_matches('\u{feff}')).map_err(|problem| problem.to_string())?;
    let Some(game) = list.games.into_iter().find(|game| game.id == id) else { return Ok(None) };
    if let Some(kind) = game.places.keys().find(|kind| !PLACE_KINDS.contains(&kind.as_str())) {
        return Err(format!("{id} names a place of kind {kind:?}; the kinds are {}", PLACE_KINDS.join(", ")));
    }
    Ok(Some(GamePlaces { name: game.name, steam_app_id: game.steam_app_id, places: game.places }))
}

pub fn find(id: &str) -> Result<Option<Game>, Failure> {
    Ok(load()?.unwrap_or_default().into_iter().find(|game| game.id == id))
}

/// Every repository of one game; none for a game not on the list.
pub fn repositories_of(id: &str) -> Result<Vec<Repository>, Failure> {
    Ok(find(id)?.map(|game| game.repositories).unwrap_or_default())
}

/// One of a game's repositories by name, refused in words when it is not one of the game's.
pub fn named_repository(id: &str, name: &str) -> Result<Repository, Failure> {
    repositories_of(id)?
        .into_iter()
        .find(|repository| repository.name == name)
        .ok_or_else(|| Failure::refused(format!("{name} is not one of this game's repositories")))
}

/// Every repository of every game, each once, in the list's order.
pub fn every_repository() -> Result<Vec<Repository>, Failure> {
    let mut found: Vec<Repository> = Vec::new();
    for game in load()?.unwrap_or_default() {
        for repository in game.repositories {
            if !found.iter().any(|known| known.path == repository.path) {
                found.push(repository);
            }
        }
    }
    Ok(found)
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
