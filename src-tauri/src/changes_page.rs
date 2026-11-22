//! The Changes page and the code viewer: what each repository's changelogs say changed lately, and the code behind any one entry.
//!
//! Both run the kit's `changes`, which only reads and names no game: any repository of any game with a changelog is read the same
//! way. The host still checks every request before the kit sees it: the repository must be one of the game's, the changelog a plain
//! path inside it ending in the changelog's file name, and the entry's text of a sane length. The kit then checks the changelog is
//! one of the repository's and the entry is in it.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit::{self, Outcome};
use serde::Serialize;
use serde_json::Value;
use std::path::Path;

const TOOL: &str = "changes";
const LIST: &str = "list";
const ENTRY: &str = "entry";
/// Every version of each changelog (kit 1.40.0): the window pages through them.
const VERSIONS: &str = "0";
const MAX_TEXT: usize = 4000;

/// One repository's changelogs, as the kit reads them.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct RepositoryChanges {
    pub repository: String,
    /// The kit's list: each changelog's path, product and newest versions with their entries.
    pub changelogs: Value,
}

/// The code behind one entry, or why the kit could not find it.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct EntryCode {
    pub found: bool,
    pub refusal: Option<String>,
    /// The kit's `data`: the commit, the entries written with it, and the files with their hunks.
    pub code: Value,
    pub command_line: String,
}

/// Every repository of a game that keeps at least one changelog.
pub fn read(game: &str, listener: Option<kit::Listener>) -> Result<Vec<RepositoryChanges>, Failure> {
    let mut found = Vec::new();
    for repository in games::repositories_of(game)?.into_iter().filter(|r| r.path.is_dir()) {
        let answer = kit::run_hearing(TOOL, &list_arguments(&repository.path), listener)?;
        // A repository with no changelog comes too, with none listed (0.53.0): the page offers its commits instead.
        let changelogs = answer["data"]["changelogs"].clone();
        let changelogs = if changelogs.is_array() { changelogs } else { Value::Array(Vec::new()) };
        found.push(RepositoryChanges { repository: repository.name, changelogs });
    }
    Ok(found)
}

fn list_arguments(root: &Path) -> Vec<String> {
    Args::new(TOOL, LIST).root(root).pair("--versions", VERSIONS).json()
}

fn changelog_checked(changelog: &str) -> Result<(), String> {
    if checks::changelog_path(changelog) {
        Ok(())
    } else {
        Err(format!("{changelog:?} is not a changelog's path in a repository"))
    }
}

pub fn entry_arguments(root: &Path, changelog: &str, text: &str) -> Result<Vec<String>, String> {
    changelog_checked(changelog)?;
    let text = checks::one_line(text);
    if text.is_empty() || text.chars().count() > MAX_TEXT {
        return Err("that entry's text is empty or too long to look for".to_owned());
    }
    Ok(Args::new(TOOL, ENTRY).root(root).pair("--changelog", changelog).given("--text", &text).json())
}

/// The code of one commit, with every entry it wrote into the changelog: for a fact on the Timeline page, whose entries may since
/// have been reworded or removed. The changelog may be one the repository no longer has; the kit checks the commit is there. An
/// empty changelog (0.53.0) is a repository that keeps none: the commit alone, naming no entries.
pub fn commit_arguments(root: &Path, changelog: &str, commit: &str) -> Result<Vec<String>, String> {
    if !changelog.is_empty() {
        changelog_checked(changelog)?;
    }
    if !checks::commit_hash(commit) {
        return Err(format!("{commit:?} is not a commit"));
    }
    let arguments = Args::new(TOOL, ENTRY).root(root);
    let arguments = if changelog.is_empty() { arguments } else { arguments.pair("--changelog", changelog) };
    Ok(arguments.given("--commit", commit).json())
}

/// Commits listed a page (0.53.0).
pub const COMMITS_PER_PAGE: u32 = 20;
/// The furthest back a page may start: well past any repository of the owner's.
const MAX_SKIP: u32 = 100_000;

pub fn commits_arguments(root: &Path, skip: u32) -> Result<Vec<String>, String> {
    if skip > MAX_SKIP {
        return Err("that is further back than this program lists".to_owned());
    }
    Ok(Args::new(TOOL, "commits")
        .root(root)
        .pair("--top", &COMMITS_PER_PAGE.to_string())
        .pair("--skip", &skip.to_string())
        .json())
}

/// A repository's commits, newest first, from `skip` on (0.53.0; the owner's choice of 23 Nov 2026): for a repository with no
/// changelog, where no entry leads to its code. Only reads.
pub fn commits(game: &str, repository: &str, skip: u32, listener: Option<kit::Listener>) -> Result<Value, Failure> {
    let found = games::named_repository(game, repository)?;
    let arguments = commits_arguments(&found.path, skip).map_err(Failure::refused)?;
    let answer = kit::run_hearing(TOOL, &arguments, listener)?;
    Outcome::required(&answer)?;
    Ok(answer["data"].clone())
}

/// The code behind one entry of one of the game's repositories, or, with a commit named, behind that commit.
pub fn entry_code(
    game: &str,
    repository: &str,
    changelog: &str,
    text: &str,
    commit: Option<&str>,
    listener: Option<kit::Listener>,
) -> Result<EntryCode, Failure> {
    let found = games::named_repository(game, repository)?;
    let arguments = match commit {
        Some(commit) => commit_arguments(&found.path, changelog, commit),
        None => entry_arguments(&found.path, changelog, text),
    }
    .map_err(Failure::refused)?;
    let answer = kit::run_hearing(TOOL, &arguments, listener)?;
    crate::changed_files::remember(&found.path, &answer["data"]);
    Ok(result_of(&answer, repository))
}

fn result_of(answer: &Value, repository: &str) -> EntryCode {
    let outcome = Outcome::of(answer);
    EntryCode {
        found: outcome.ok,
        refusal: outcome.refusal,
        code: answer["data"].clone(),
        command_line: format!("python -m phobos_modkit changes entry   (on {repository})"),
    }
}

#[cfg(test)]
#[path = "tests/changes_page.rs"]
mod tests;
