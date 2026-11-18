//! The Timeline page: what happened to a game's products over time, and any changelog as it stood at any moment.
//!
//! Both run the kit's `history`, which only reads and names no game. Facts from git come from every repository on the game's list;
//! facts about this PC (installed, went back, backed up, built, textures encoded) come from the history log the kit keeps for the
//! game, by the game's ID on the owner's list. The host checks every request before the kit sees it: the repository must be one of
//! the game's, the changelog a plain path inside it, and the commit or moment plain text of the right shape.

use crate::changes_page::changelog_path;
use crate::failure::{Failure, FailureCode};
use crate::games;
use crate::kit;
use serde::Serialize;
use serde_json::Value;
use std::path::Path;

const TOOL: &str = "history";
const TIMELINE: &str = "timeline";
const AT: &str = "at";
const MAX_MOMENT: usize = 40;

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

/// Every fact about a game's products. A game not on the list has none.
pub fn read(game: &str, listener: Option<kit::Listener>) -> Result<Timeline, Failure> {
    let Some(found) = games::load()?.unwrap_or_default().into_iter().find(|g| g.id == game) else {
        return Ok(Timeline { repositories: Vec::new(), facts: Value::Array(Vec::new()), log_exists: false });
    };
    let roots: Vec<_> = found.repositories.into_iter().filter(|r| r.path.is_dir()).collect();
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
    let mut arguments = vec![TOOL.to_owned(), TIMELINE.to_owned()];
    for root in roots {
        arguments.push("--root".to_owned());
        arguments.push(root.display().to_string());
    }
    // One argument, so a game's ID is never read as an option.
    arguments.extend([format!("--game={game}"), "--top=0".to_owned(), "--json".to_owned()]);
    arguments
}

/// A commit's hash: 7 to 40 lower-case hexadecimal characters.
pub fn commit_hash(text: &str) -> bool {
    (7..=40).contains(&text.len()) && text.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

/// A moment as the kit's facts write it: an ISO date or time, digits and the few marks between them.
pub fn moment(text: &str) -> bool {
    !text.is_empty()
        && text.len() <= MAX_MOMENT
        && text.as_bytes()[0].is_ascii_digit()
        && text.bytes().all(|b| b.is_ascii_digit() || b"-:T+Z.".contains(&b))
}

pub fn at_arguments(
    root: &Path,
    changelog: &str,
    commit: Option<&str>,
    when: Option<&str>,
) -> Result<Vec<String>, String> {
    if !changelog_path(changelog) {
        return Err(format!("{changelog:?} is not a changelog's path in a repository"));
    }
    let mut arguments = vec![
        TOOL.to_owned(),
        AT.to_owned(),
        "--root".to_owned(),
        root.display().to_string(),
        "--changelog".to_owned(),
        changelog.to_owned(),
    ];
    match (commit, when) {
        (Some(commit), _) if commit_hash(commit) => arguments.push(format!("--commit={commit}")),
        (None, Some(when)) if moment(when) => arguments.push(format!("--when={when}")),
        _ => return Err("name a commit or a moment to read the changelog at".to_owned()),
    }
    arguments.push("--json".to_owned());
    Ok(arguments)
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
    let refused = |detail: String| Failure::new(FailureCode::Refused, detail);
    let found = games::load()?
        .unwrap_or_default()
        .into_iter()
        .find(|g| g.id == game)
        .and_then(|g| g.repositories.into_iter().find(|r| r.name == repository))
        .ok_or_else(|| refused(format!("{repository} is not one of this game's repositories")))?;
    let arguments = at_arguments(&found.path, changelog, commit, when).map_err(refused)?;
    let answer = kit::run_hearing(TOOL, &arguments, listener)?;
    Ok(stood_of(&answer))
}

fn stood_of(answer: &Value) -> AsItStood {
    let data = &answer["data"];
    AsItStood {
        found: data["ok"] != Value::Bool(false),
        refusal: data["refusal"].as_str().map(str::to_owned),
        stood: data.clone(),
    }
}

#[cfg(test)]
#[path = "tests/history_page.rs"]
mod tests;
