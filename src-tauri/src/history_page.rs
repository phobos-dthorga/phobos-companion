//! The Timeline page: what happened to a game's products over time, and any changelog as it stood at any moment.
//!
//! Both run the kit's `history`, which only reads and names no game. Facts from git come from every repository on the game's list;
//! facts about this PC (installed, went back, backed up, built, textures encoded) come from the history log the kit keeps for the
//! game, by the game's ID on the owner's list. The host checks every request before the kit sees it: the repository must be one of
//! the game's, the changelog a plain path inside it, and the commit or moment plain text of the right shape.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit::{self, Outcome};
use serde::Serialize;
use serde_json::Value;
use std::path::Path;

const TOOL: &str = "history";
const TIMELINE: &str = "timeline";
const AT: &str = "at";

/// Every fact about a game's products, newest first, as the kit gives them.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Timeline {
    pub repositories: Vec<String>,
    /// The kit's facts: each with its kind, time, source (git or log), product, and what it holds.
    pub facts: Value,
    /// Whether this PC's history log for the game has been written yet.
    pub log_exists: bool,
}

/// A changelog as it stood, or why the kit could not read it.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct AsItStood {
    pub found: bool,
    pub refusal: Option<String>,
    /// The kit's `data`: the product, the commit, each version with its entries marked kept, reworded or removed since.
    pub stood: Value,
}

/// Every fact about a game's products. A game not on the list, or with no repository on this PC, has none.
pub fn read(game: &str, listener: Option<kit::Listener>) -> Result<Timeline, Failure> {
    let roots: Vec<_> = games::repositories_of(game)?.into_iter().filter(|r| r.path.is_dir()).collect();
    if roots.is_empty() {
        return Ok(Timeline { repositories: Vec::new(), facts: Value::Array(Vec::new()), log_exists: false });
    }
    let paths: Vec<&Path> = roots.iter().map(|r| r.path.as_path()).collect();
    let answer = kit::run_hearing(TOOL, &timeline_arguments(&paths, game), listener)?;
    Ok(Timeline {
        repositories: roots.into_iter().map(|r| r.name).collect(),
        facts: answer["data"]["facts"].clone(),
        log_exists: answer["data"]["logExists"].as_bool().unwrap_or(false),
    })
}

pub fn timeline_arguments(roots: &[&Path], game: &str) -> Vec<String> {
    Args::new(TOOL, TIMELINE).roots(roots.iter().copied()).given("--game", game).given("--top", "0").json()
}

pub fn at_arguments(
    root: &Path,
    changelog: &str,
    commit: Option<&str>,
    when: Option<&str>,
) -> Result<Vec<String>, String> {
    if !checks::changelog_path(changelog) {
        return Err(format!("{changelog:?} is not a changelog's path in a repository"));
    }
    let arguments = Args::new(TOOL, AT).root(root).pair("--changelog", changelog);
    let arguments = match (commit, when) {
        (Some(commit), _) if checks::commit_hash(commit) => arguments.given("--commit", commit),
        (None, Some(when)) if checks::moment(when) => arguments.given("--when", when),
        _ => return Err("name a commit or a moment to read the changelog at".to_owned()),
    };
    Ok(arguments.json())
}

/// A changelog of one of the game's repositories as it stood at a commit, or at a moment when no commit is named.
pub fn as_it_stood(
    game: &str,
    repository: &str,
    changelog: &str,
    commit: Option<&str>,
    when: Option<&str>,
    listener: Option<kit::Listener>,
) -> Result<AsItStood, Failure> {
    let found = games::named_repository(game, repository)?;
    let arguments = at_arguments(&found.path, changelog, commit, when).map_err(Failure::refused)?;
    let answer = kit::run_hearing(TOOL, &arguments, listener)?;
    Ok(stood_of(&answer))
}

fn stood_of(answer: &Value) -> AsItStood {
    let outcome = Outcome::of(answer);
    AsItStood { found: outcome.ok, refusal: outcome.refusal, stood: answer["data"].clone() }
}

#[cfg(test)]
#[path = "tests/history_page.rs"]
mod tests;
