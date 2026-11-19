//! Add a game from Steam (0.31.0; `docs/later.md` item 5, agreed by the owner on 19 Nov 2026): every game Steam has installed, with
//! the kit's guesses at its data folder (`game-files steam-games`, kit 1.58.0) and whether the list already holds it, and the one
//! write this page makes, the new entry, on the owner's press. The list as it was is kept beside it (`games::BEFORE_ADD`).

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::games::{self, Listed, NewGame};
use companion_core::kit;
use serde::Serialize;
use serde_json::Value;

const TOOL: &str = "game-files";
const STEAM_GAMES: &str = "steam-games";

/// What the add dialog offers.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct SteamGames {
    /// Each game as the kit gives it (appId, name, install, dataGuesses...), with `listedAs`: the id it has on the list, or null.
    pub games: Vec<Value>,
    /// Folders under the list's root holding a repository no game names.
    pub repositories: Vec<String>,
    pub list_file: String,
    /// Whether there is a list to add to.
    pub list_exists: bool,
}

/// What a press of Add did.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Added {
    pub id: String,
    pub list_file: String,
    /// The copy of the list as it was.
    pub before: String,
}

pub fn steam_arguments() -> Vec<String> {
    // Full paths: the owner picks a data folder from them, and they are written into the list as shown.
    Args::new(TOOL, STEAM_GAMES).flag("--no-redact").json()
}

/// The id a Steam game already has on the list: by its app ID, else by its name (the list's older entries have no app ID).
pub fn listed_as(game: &Value, listed: &[Listed]) -> Option<String> {
    let app = game["appId"].as_u64();
    let name = game["name"].as_str().unwrap_or_default().to_lowercase();
    listed
        .iter()
        .find(|l| app.is_some() && l.steam_app_id.map(u64::from) == app)
        .or_else(|| listed.iter().find(|l| l.name.to_lowercase() == name))
        .map(|l| l.id.clone())
}

pub fn steam_games(listener: Option<kit::Listener>) -> Result<SteamGames, Failure> {
    let answer = kit::run_hearing(TOOL, &steam_arguments(), listener)?;
    let (listed, root) = games::listed()?.unwrap_or_default();
    let games = answer["data"]["games"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|mut game| {
            game["listedAs"] = listed_as(&game, &listed).map_or(Value::Null, Value::String);
            game
        })
        .collect();
    let repositories = match root {
        Some(root) => games::unlisted_repositories(&root, &games::listed_repository_paths()?),
        None => Vec::new(),
    };
    let list_file = games::list_file();
    Ok(SteamGames { games, repositories, list_exists: list_file.is_file(), list_file: list_file.display().to_string() })
}

/// Adds the game the owner chose. The host checks everything again, whatever the window sent.
pub fn add(game: &NewGame) -> Result<Added, Failure> {
    let path = games::add(game)?;
    let before = path.parent().map(|folder| folder.join(games::BEFORE_ADD)).unwrap_or_default();
    Ok(Added {
        id: game.id.trim().to_owned(),
        list_file: path.display().to_string(),
        before: before.display().to_string(),
    })
}

#[cfg(test)]
#[path = "tests/games_page.rs"]
mod tests;
