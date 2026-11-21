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
//!
//! Every game (0.44.0; the owner, 22 Nov 2026: "work across as many individual games and their mods from the get go"): a game's own
//! files, its saves and settings, are listed once for the game, in any repository on the owner's list
//! (`config/safe-copies/<game>.json`; the kit keeps the owner's, kit 1.71.0), and that list shows on the game's Home beside its
//! repositories' own. **The daily run** is the kit's `safe-copies schedule`: one Windows scheduled task of the owner's own, set to a
//! time the owner presses or turned off, running every list on the owner's games list.

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
const SCHEDULE: &str = "schedule";
/// The kit's rule for a set's or a training's name: letters, digits, dots, dashes and underscores, starting with a letter or digit.
const MAX_SET_NAME: usize = 81;
const CONFIG: [&str; 2] = ["config", "safe-copies.json"];
/// Where a repository keeps a game's own list (kit 1.71.0): `config/safe-copies/<game>.json`.
const GAME_LISTS: [&str; 2] = ["config", "safe-copies"];

/// One list's safe copies, as the kit reads them: a repository's own list, or the game's own list that repository keeps.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct RepositoryCopies {
    pub repository: String,
    /// True for the game's own list (its saves and settings) kept in this repository (0.44.0).
    pub list: bool,
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

fn game_list_path(path: &Path, game: &str) -> PathBuf {
    path.join(GAME_LISTS[0]).join(GAME_LISTS[1]).join(format!("{game}.json"))
}

/// Every list a game's Home shows: each of its repositories' own, then the game's own list wherever on the owner's list a
/// repository keeps one. The bool is true for the game's own list.
fn lists_of(game: &str) -> Result<Vec<(Repository, bool)>, Failure> {
    let mut found: Vec<(Repository, bool)> =
        games::repositories_of(game)?.into_iter().filter(|r| opts_in(&r.path)).map(|r| (r, false)).collect();
    if games::valid_id(game) {
        found.extend(
            games::every_repository()?
                .into_iter()
                .filter(|r| game_list_path(&r.path, game).is_file())
                .map(|r| (r, true)),
        );
    }
    Ok(found)
}

fn opted_in(game: &str, repository: &str, list: bool) -> Result<Repository, Failure> {
    lists_of(game)?
        .into_iter()
        .find(|(r, game_list)| r.name == repository && *game_list == list)
        .map(|(r, _)| r)
        .ok_or_else(|| Failure::refused(format!("{repository} does not list any safe copies for this game")))
}

/// The arguments naming which list: none for a repository's own, `--game` for the game's own list it keeps.
fn on_list(arguments: Args, game: &str, list: bool) -> Args {
    if list { arguments.given("--game", game) } else { arguments }
}

pub fn status_arguments(root: &Path, game: &str, list: bool) -> Vec<String> {
    // Full paths: the card says where the copies are, and the owner may want to find them.
    on_list(Args::new(TOOL, STATUS).root(root), game, list).flag("--no-redact").json()
}

pub fn run_arguments(root: &Path, game: &str, list: bool) -> Vec<String> {
    on_list(Args::new(TOOL, RUN).root(root), game, list).flag("--no-redact").json()
}

pub fn verify_arguments(root: &Path) -> Vec<String> {
    Args::new(TOOL, VERIFY).root(root).flag("--no-redact").json()
}

/// Every list a game's Home shows, read through the kit. None for a game that lists none.
pub fn read(game: &str, listener: Option<kit::Listener>) -> Result<Vec<RepositoryCopies>, Failure> {
    let mut found = Vec::new();
    for (repository, list) in lists_of(game)? {
        let answer = kit::run_hearing(TOOL, &status_arguments(&repository.path, game, list), listener)?;
        Outcome::required(&answer)?;
        found.push(RepositoryCopies {
            status: answer["data"].clone(),
            title: answer["report"]["title"].as_str().unwrap_or_default().to_owned(),
            command_line: format!(
                "python -m phobos_modkit safe-copies status --root \"{}\"{}",
                repository.path.display(),
                if list { format!(" --game {game}") } else { String::new() }
            ),
            repository: repository.name,
            list,
        });
    }
    Ok(found)
}

/// Copy now: copies what changed, then commits and pushes the repository's copy.
pub fn copy_now(
    game: &str,
    repository: &str,
    list: bool,
    listener: Option<kit::Listener>,
) -> Result<CopyResult, Failure> {
    let found = opted_in(game, repository, list)?;
    allowed_by_manifest(&kit::read_manifest()?, TOOL, RUN).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &run_arguments(&found.path, game, list), listener)?))
}

/// Check the copies: hashes every copy again against its record. Only reads.
pub fn check(game: &str, repository: &str, list: bool, listener: Option<kit::Listener>) -> Result<CopyResult, Failure> {
    let found = opted_in(game, repository, list)?;
    Ok(result_of(&kit::run_hearing(TOOL, &verify_arguments(&found.path), listener)?))
}

/// A time of day as the daily run takes it: HH:MM, 00:00 to 23:59.
pub fn daily_time(text: &str) -> bool {
    let b = text.as_bytes();
    b.len() == 5
        && b[2] == b':'
        && [0, 1, 3, 4].iter().all(|&i| b[i].is_ascii_digit())
        && (b[0] - b'0') * 10 + (b[1] - b'0') < 24
        && b[3] < b'6'
}

/// The daily run's request: how it stands, or set it to a time, or turn it off (`at` None with `off`).
pub fn schedule_arguments(at: Option<&str>, off: bool, games: &Path) -> Vec<String> {
    let mut arguments = Args::new(TOOL, SCHEDULE);
    if let Some(at) = at {
        arguments = arguments.given("--at", at).path("--games", games);
    } else if off {
        arguments = arguments.flag("--off");
    }
    arguments.flag("--no-redact").json()
}

/// The daily run: whether it is set, at what time, when next, and how the last went. Only reads.
pub fn daily(listener: Option<kit::Listener>) -> Result<CopyResult, Failure> {
    Ok(result_of(&kit::run_hearing(TOOL, &schedule_arguments(None, false, &games::list_file()), listener)?))
}

/// Sets the daily run to a time the owner pressed, or turns it off (`at` None). It runs every list on the owner's games list,
/// the one this program reads.
pub fn set_daily(at: Option<&str>, listener: Option<kit::Listener>) -> Result<CopyResult, Failure> {
    if at.is_some_and(|at| !daily_time(at)) {
        return Err(Failure::refused("that is not a time of day such as 04:00"));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, SCHEDULE).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &schedule_arguments(at, at.is_none(), &games::list_file()), listener)?))
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

pub fn restore_arguments(
    root: &Path,
    game: &str,
    list: bool,
    set: &str,
    unit: Option<&str>,
    to: &Path,
    overwrite: bool,
) -> Vec<String> {
    let mut arguments = on_list(Args::new(TOOL, RESTORE).root(root), game, list).given("--set", set);
    if let Some(unit) = unit {
        arguments = arguments.given("--unit", unit);
    }
    arguments = arguments.path("--to", to);
    if overwrite {
        arguments = arguments.flag("--overwrite");
    }
    arguments.flag("--no-redact").json()
}

pub fn let_go_arguments(root: &Path, game: &str, list: bool, copy: &str) -> Vec<String> {
    on_list(Args::new(TOOL, LET_GO).root(root), game, list)
        .given("--file", copy)
        .flag("--apply")
        .flag("--no-redact")
        .json()
}

/// Restore: copies one set, or one training of it, into the folder the owner picked. With `overwrite`, files there older than the
/// copy are replaced; a newer one never is (the kit refuses, and says which).
#[allow(clippy::too_many_arguments)]
pub fn restore(
    game: &str,
    repository: &str,
    list: bool,
    set: &str,
    unit: Option<&str>,
    to: &str,
    overwrite: bool,
    listener: Option<kit::Listener>,
) -> Result<CopyResult, Failure> {
    let found = opted_in(game, repository, list)?;
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
    let arguments = restore_arguments(&found.path, game, list, set, unit, &folder, overwrite);
    Ok(result_of(&kit::run_hearing(TOOL, &arguments, listener)?))
}

/// Let go: removes one copy the kit lists as no longer taken, with its earlier copies: a file, or a save that is a folder, whole.
/// The kit refuses any copy still taken.
pub fn let_go(
    game: &str,
    repository: &str,
    list: bool,
    copy: &str,
    listener: Option<kit::Listener>,
) -> Result<CopyResult, Failure> {
    let found = opted_in(game, repository, list)?;
    if !copy_name(copy) {
        return Err(Failure::refused("that is not the name of a copy"));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, LET_GO).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &let_go_arguments(&found.path, game, list, copy), listener)?))
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
