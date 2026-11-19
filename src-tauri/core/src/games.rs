//! The owner's list of games and their repositories. It holds personal paths, so it lives outside version control.

use crate::failure::{Failure, FailureCode};
use serde::{Deserialize, Serialize};
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
    /// A game, or a set of tools listed beside the games so their own work shows too (0.24.0); a game when the list says nothing.
    #[serde(default)]
    kind: GameKind,
}

/// What an entry on the list is (0.24.0, the owner: the Companion "as its own game"). Tools have repositories, changelogs and
/// history like any game, but no saves, log, running game or game files, so the pages for those say so instead of looking.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum GameKind {
    #[default]
    Game,
    Tools,
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
    pub kind: GameKind,
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

// ---------------------------------------------------------------- adding a game (0.31.0)

/// The longest id and name a new entry may have.
pub const MAX_ID: usize = 40;
pub const MAX_NAME: usize = 100;
/// Beside the list, the list as it was before the last game was added: one copy, replaced at each add.
pub const BEFORE_ADD: &str = "games.json.before-add";

/// A game to add to the list, as the owner chose it from Steam's (0.31.0, `docs/later.md` item 5: "Add a game from Steam").
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct NewGame {
    pub id: String,
    pub name: String,
    pub steam_app_id: Option<u32>,
    /// Its data folder, a full path, when the owner chose one.
    pub data: Option<String>,
    /// Folder names under the list's root.
    pub repositories: Vec<String>,
}

/// One entry already on the list: enough to say a Steam game is listed, and to keep ids apart.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Listed {
    pub id: String,
    pub name: String,
    pub steam_app_id: Option<u32>,
}

/// Where the list lives.
pub fn list_file() -> PathBuf {
    list_path()
}

fn read_list(text: &str) -> Result<ListFile, String> {
    serde_json::from_str(text.trim_start_matches('\u{feff}')).map_err(|problem| problem.to_string())
}

/// The entries on the list and its root folder, as `listed` gives them.
pub type Listing = (Vec<Listed>, Option<PathBuf>);

/// The entries on the list, and its root, for the add dialog; None when there is no list.
pub fn listed() -> Result<Option<Listing>, Failure> {
    let path = list_path();
    let unreadable =
        |detail: String| Failure::new(FailureCode::ListUnreadable, format!("{}: {detail}", path.display()));
    let text = match fs::read_to_string(&path) {
        Ok(text) => text,
        Err(problem) if problem.kind() == ErrorKind::NotFound => return Ok(None),
        Err(problem) => return Err(unreadable(problem.to_string())),
    };
    let list = read_list(&text).map_err(unreadable)?;
    let games =
        list.games.into_iter().map(|g| Listed { id: g.id, name: g.name, steam_app_id: g.steam_app_id }).collect();
    Ok(Some((games, list.root)))
}

/// An id a new entry may take: lower-case letters, digits and dashes, starting with a letter or digit.
pub fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_ID
        && id.chars().next().is_some_and(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
        && id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

/// A repository named as a plain folder under the root: no separators, no `..`.
fn plain_folder(name: &str) -> bool {
    !name.is_empty() && name != "." && name != ".." && !name.contains(['/', '\\', ':']) && name.trim() == name
}

/// The list's new text with the game added, checked: the id and the Steam game are not on it yet, the name is one line, the data
/// folder and every repository are folders that exist (`exists` asks), and the new text reads back as a list holding the game.
/// The list's own order and fields are kept (serde_json's `preserve_order`).
pub fn with_game(text: &str, game: &NewGame, exists: impl Fn(&Path) -> bool) -> Result<String, String> {
    let list = read_list(text)?;
    let id = game.id.trim();
    if !valid_id(id) {
        return Err(format!(
            "{id:?} cannot be a game's id: up to {MAX_ID} lower-case letters, digits and dashes, starting with a letter or digit"
        ));
    }
    if let Some(taken) = list.games.iter().find(|g| g.id == id) {
        return Err(format!("the id {id} is already {}'s", taken.name));
    }
    let name = crate::checks::one_line(&game.name);
    if name.is_empty() || name.chars().count() > MAX_NAME {
        return Err(format!("a game's name is one line of up to {MAX_NAME} characters"));
    }
    if let Some(same) = list.games.iter().find(|g| g.name.to_lowercase() == name.to_lowercase()) {
        return Err(format!("{name} is already on the list, as {}", same.id));
    }
    if let Some(app) = game.steam_app_id
        && let Some(same) = list.games.iter().find(|g| g.steam_app_id == Some(app))
    {
        return Err(format!("Steam's game {app} is already on the list, as {}", same.id));
    }
    let data = match game.data.as_deref().map(|d| d.trim().trim_matches('"')).filter(|d| !d.is_empty()) {
        None => None,
        Some(data) => {
            let path = Path::new(data);
            if !path.is_absolute() {
                return Err(format!(
                    "the data folder must be a full path, such as C:\\Users\\you\\AppData\\LocalLow\\Maker\\Game; {data} is not"
                ));
            }
            if !exists(path) {
                return Err(format!("{data} is not a folder on this PC"));
            }
            Some(data.to_owned())
        }
    };
    for repository in &game.repositories {
        if !plain_folder(repository) {
            return Err(format!("{repository:?} is not a folder's name"));
        }
        let Some(root) = &list.root else {
            return Err("the list names no root folder, so a repository cannot be found by its name".to_owned());
        };
        if !exists(&root.join(repository)) {
            return Err(format!("{repository} is not a folder in {}", root.display()));
        }
    }
    let mut document: serde_json::Value =
        serde_json::from_str(text.trim_start_matches('\u{feff}')).map_err(|problem| problem.to_string())?;
    let mut entry = serde_json::Map::new();
    entry.insert("id".into(), id.into());
    entry.insert("name".into(), name.clone().into());
    entry.insert("repositories".into(), game.repositories.clone().into());
    if let Some(app) = game.steam_app_id {
        entry.insert("steam_app_id".into(), app.into());
    }
    if let Some(data) = data {
        entry.insert("places".into(), serde_json::json!({ "data": data }));
    }
    document
        .get_mut("games")
        .and_then(serde_json::Value::as_array_mut)
        .ok_or("the list has no games")?
        .push(serde_json::Value::Object(entry));
    let written = serde_json::to_string_pretty(&document).map_err(|problem| problem.to_string())? + "\n";
    let read_back = parse(&written)?;
    if !read_back.iter().any(|g| g.id == id) {
        return Err("the new list did not read back with the game in it; nothing was written".to_owned());
    }
    Ok(written)
}

/// Adds a game to the list: the list as it was is kept beside it (`BEFORE_ADD`), the new one written whole and then put in its
/// place. Returns the list's path. Refused in words, writing nothing, when there is no list or the game cannot be added.
pub fn add(game: &NewGame) -> Result<PathBuf, Failure> {
    let path = list_path();
    let text = match fs::read_to_string(&path) {
        Ok(text) => text,
        Err(problem) if problem.kind() == ErrorKind::NotFound => {
            return Err(Failure::refused(format!(
                "there is no games list at {} yet; make one from config/games.example.json first",
                path.display()
            )));
        }
        Err(problem) => return Err(Failure::new(FailureCode::ListUnreadable, problem.to_string())),
    };
    let written = with_game(&text, game, Path::is_dir).map_err(Failure::refused)?;
    let folder = path.parent().map(Path::to_path_buf).unwrap_or_default();
    let failed = |problem: std::io::Error| Failure::new(FailureCode::WriteFailed, problem.to_string());
    fs::write(folder.join(BEFORE_ADD), &text).map_err(failed)?;
    let fresh = folder.join("games.json.new");
    fs::write(&fresh, written).map_err(failed)?;
    fs::rename(&fresh, &path).map_err(failed)?;
    Ok(path)
}

/// Folders under the root that hold a git repository and no game on the list names, by name; for the add dialog's choices.
pub fn unlisted_repositories(root: &Path, listed: &[PathBuf]) -> Vec<String> {
    let Ok(entries) = fs::read_dir(root) else { return Vec::new() };
    let mut found: Vec<String> = entries
        .filter_map(Result::ok)
        .filter(|entry| entry.path().join(".git").exists())
        .map(|entry| entry.file_name().to_string_lossy().into_owned())
        .filter(|name| !listed.iter().any(|known| known.file_name().is_some_and(|f| f.to_string_lossy() == *name)))
        .collect();
    found.sort_by_key(|name| name.to_lowercase());
    found
}

/// Every repository path the list names, as written, for `unlisted_repositories`.
pub fn listed_repository_paths() -> Result<Vec<PathBuf>, Failure> {
    Ok(load()?.unwrap_or_default().into_iter().flat_map(|g| g.repositories.into_iter().map(|r| r.path)).collect())
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
        games.push(Game { id: game.id, name: game.name, repositories, kind: game.kind });
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
