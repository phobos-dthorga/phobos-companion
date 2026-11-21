//! Safe copies on Home (0.42.0; the owner, 21 Nov 2026: copies of "our training sets, models, etc.", shown in the Companion): each
//! of a game's repositories that lists what cannot be made again (`config/safe-copies.json`) says, through the kit's
//! `safe-copies status`, what is copied, changed since its copy, or never copied, and which destinations are ready.
//!
//! Two presses: **Copy now** runs the kit's `safe-copies run`, which copies what changed into the folders the owner chose and
//! marked, and commits and pushes the repository's copy; **Check the copies** runs `safe-copies verify`, which only reads. The
//! host checks the repository is one of the game's and opts in, and runs Copy now only while the kit's manifest still calls it
//! `writes`. The kit keeps the rules on kinds: nothing made from a game's files reaches a shared place, and nothing at a source
//! is deleted.
//!
//! Two more presses (0.43.0; the owner's go of 22 Nov 2026), each confirmed on the card first: **Restore** runs the kit's
//! `safe-copies restore` for one set, or one training of a set, into a folder the owner picked; it never writes over a different
//! file unless the owner then presses Replace older files, and never over a newer one. **Let go** runs `safe-copies let-go --apply`
//! for one copy the kit lists as no longer taken (a save that left the newest pair). The host checks every name and the folder
//! before the kit sees them, and runs each only while the kit's manifest calls it `writes`.

use companion_core::args::Args;
use companion_core::checks;
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
const RESTORE: &str = "restore";
const LET_GO: &str = "let-go";
/// The kit's rule for a set's or a training's name: letters, digits, dots, dashes and underscores, starting with a letter or digit.
const MAX_SET_NAME: usize = 81;
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

/// A set's or a training's name, as the kit allows them.
pub fn set_name(text: &str) -> bool {
    !text.is_empty()
        && text.len() <= MAX_SET_NAME
        && text.as_bytes()[0].is_ascii_alphanumeric()
        && text.bytes().all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b))
}

/// A copy as the kit's status names it: a relative path with forward slashes, no step upwards, nothing that reads as an option.
pub fn copy_name(text: &str) -> bool {
    !text.is_empty()
        && text.len() <= checks::MAX_PATH
        && !text.starts_with(['/', '-'])
        && !text.contains(['\\', ':', '\0', '\n', '\r'])
        && text.split('/').count() >= 3
        && text.split('/').all(|part| !part.is_empty() && part != "." && part != "..")
}

pub fn restore_arguments(root: &Path, set: &str, unit: Option<&str>, to: &Path, overwrite: bool) -> Vec<String> {
    let mut arguments = Args::new(TOOL, RESTORE).root(root).given("--set", set);
    if let Some(unit) = unit {
        arguments = arguments.given("--unit", unit);
    }
    arguments = arguments.path("--to", to);
    if overwrite {
        arguments = arguments.flag("--overwrite");
    }
    arguments.flag("--no-redact").json()
}

pub fn let_go_arguments(root: &Path, copy: &str) -> Vec<String> {
    Args::new(TOOL, LET_GO).root(root).given("--file", copy).flag("--apply").flag("--no-redact").json()
}

/// Restore: copies one set, or one training of it, into the folder the owner picked. With `overwrite`, files there older than the
/// copy are replaced; a newer one never is (the kit refuses, and says which).
pub fn restore(
    game: &str,
    repository: &str,
    set: &str,
    unit: Option<&str>,
    to: &str,
    overwrite: bool,
    listener: Option<kit::Listener>,
) -> Result<CopyResult, Failure> {
    let found = opted_in(game, repository)?;
    if !set_name(set) || unit.is_some_and(|u| !set_name(u)) {
        return Err(Failure::refused("that is not the name of a set or a training"));
    }
    let folder = PathBuf::from(to.trim());
    if !checks::setting_value(to) || !folder.is_absolute() {
        return Err(Failure::refused(
            "choose a whole folder to restore into, such as one picked with Windows' own picker",
        ));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, RESTORE).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &restore_arguments(&found.path, set, unit, &folder, overwrite), listener)?))
}

/// Let go: removes one copy the kit lists as no longer taken, with its earlier copies. The kit refuses any copy still taken.
pub fn let_go(
    game: &str,
    repository: &str,
    copy: &str,
    listener: Option<kit::Listener>,
) -> Result<CopyResult, Failure> {
    let found = opted_in(game, repository)?;
    if !copy_name(copy) {
        return Err(Failure::refused("that is not the name of a copy"));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, LET_GO).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &let_go_arguments(&found.path, copy), listener)?))
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
