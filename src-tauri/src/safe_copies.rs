//! Safe copies on Home (0.42.0; the owner, 21 Nov 2026: copies of "our training sets, models, etc.", shown in the Companion): each
//! of a game's repositories that lists what cannot be made again (`config/safe-copies.json`) says, through the kit's
//! `safe-copies status`, what is copied, changed since its copy, or never copied, and which destinations are ready.
//!
//! Two presses: **Copy now** runs the kit's `safe-copies run`, which copies what changed into the folders the owner chose and
//! marked, and commits and pushes the repository's copy; **Check the copies** runs `safe-copies verify`, which only reads. The
//! host checks the repository is one of the game's and opts in, and runs Copy now only while the kit's manifest still calls it
//! `writes`. The kit keeps the rules on kinds: nothing made from a game's files reaches a shared place, and nothing is deleted.

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::games::{self, Repository};
use companion_core::kit::{self, Outcome, allowed_by_manifest};
use serde::Serialize;
use serde_json::Value;
use std::path::{Path, PathBuf};

const TOOL: &str = "safe-copies";
const STATUS: &str = "status";
const RUN: &str = "run";
const VERIFY: &str = "verify";
const CONFIG: [&str; 2] = ["config", "safe-copies.json"];

/// One repository's safe copies, as the kit reads them.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct RepositoryCopies {
    pub repository: String,
    /// The kit's `data`: `sets` (each with its kind and its state at each destination), `destinations` and `notes`.
    pub status: Value,
    /// The kit's title, such as "Safe copies: everything copied".
    pub title: String,
    pub command_line: String,
}

/// What Copy now or Check the copies did, or why the kit refused.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct CopyResult {
    pub ok: bool,
    pub title: String,
    pub refusal: Option<String>,
    pub data: Value,
}

fn config_path(path: &Path) -> PathBuf {
    path.join(CONFIG[0]).join(CONFIG[1])
}

fn opts_in(path: &Path) -> bool {
    config_path(path).is_file()
}

/// The repositories of one game that list safe copies.
fn with_copies(game: &str) -> Result<Vec<Repository>, Failure> {
    Ok(games::repositories_of(game)?.into_iter().filter(|r| opts_in(&r.path)).collect())
}

fn opted_in(game: &str, repository: &str) -> Result<Repository, Failure> {
    with_copies(game)?
        .into_iter()
        .find(|r| r.name == repository)
        .ok_or_else(|| Failure::refused(format!("{repository} does not list any safe copies")))
}

pub fn status_arguments(root: &Path) -> Vec<String> {
    // Full paths: the card says where the copies are, and the owner may want to find them.
    Args::new(TOOL, STATUS).root(root).flag("--no-redact").json()
}

pub fn run_arguments(root: &Path) -> Vec<String> {
    Args::new(TOOL, RUN).root(root).flag("--no-redact").json()
}

pub fn verify_arguments(root: &Path) -> Vec<String> {
    Args::new(TOOL, VERIFY).root(root).flag("--no-redact").json()
}

/// Every repository of a game that lists safe copies, read through the kit. None for a game that lists none.
pub fn read(game: &str, listener: Option<kit::Listener>) -> Result<Vec<RepositoryCopies>, Failure> {
    let mut found = Vec::new();
    for repository in with_copies(game)? {
        let answer = kit::run_hearing(TOOL, &status_arguments(&repository.path), listener)?;
        Outcome::required(&answer)?;
        found.push(RepositoryCopies {
            status: answer["data"].clone(),
            title: answer["report"]["title"].as_str().unwrap_or_default().to_owned(),
            command_line: format!(
                "python -m phobos_modkit safe-copies status --root \"{}\"",
                repository.path.display()
            ),
            repository: repository.name,
        });
    }
    Ok(found)
}

/// Copy now: copies what changed, then commits and pushes the repository's copy.
pub fn copy_now(game: &str, repository: &str, listener: Option<kit::Listener>) -> Result<CopyResult, Failure> {
    let found = opted_in(game, repository)?;
    allowed_by_manifest(&kit::read_manifest()?, TOOL, RUN).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &run_arguments(&found.path), listener)?))
}

/// Check the copies: hashes every copy again against its record. Only reads.
pub fn check(game: &str, repository: &str, listener: Option<kit::Listener>) -> Result<CopyResult, Failure> {
    let found = opted_in(game, repository)?;
    Ok(result_of(&kit::run_hearing(TOOL, &verify_arguments(&found.path), listener)?))
}

fn result_of(answer: &Value) -> CopyResult {
    let outcome = Outcome::of(answer);
    CopyResult {
        ok: outcome.ok,
        title: answer["report"]["title"].as_str().unwrap_or_default().to_owned(),
        refusal: outcome.refusal,
        data: answer["data"].clone(),
    }
}

#[cfg(test)]
#[path = "tests/safe_copies.rs"]
mod tests;
