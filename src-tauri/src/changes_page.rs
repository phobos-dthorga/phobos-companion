//! The Changes page and the code viewer: what each repository's changelogs say changed lately, and the code behind any one entry.
//!
//! Both run the kit's `changes`, which only reads and names no game: any repository of any game with a changelog is read the same
//! way. The host still checks every request before the kit sees it: the repository must be one of the game's, the changelog a plain
//! path inside it ending in the changelog's file name, and the entry's text of a sane length. The kit then checks the changelog is
//! one of the repository's and the entry is in it.

use crate::failure::{Failure, FailureCode};
use crate::games::{self, Repository};
use crate::kit;
use serde::Serialize;
use serde_json::Value;
use std::path::Path;

const TOOL: &str = "changes";
const LIST: &str = "list";
const ENTRY: &str = "entry";
const CHANGELOG_NAME: &str = "CHANGELOG.md";
const VERSIONS: &str = "5";
const MAX_PATH: usize = 300;
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

fn repositories(game: &str) -> Result<Vec<Repository>, Failure> {
    let listed = games::load()?.unwrap_or_default();
    Ok(listed.into_iter().find(|g| g.id == game).map(|g| g.repositories).unwrap_or_default())
}

/// Every repository of a game that keeps at least one changelog.
pub fn read(game: &str, listener: Option<kit::Listener>) -> Result<Vec<RepositoryChanges>, Failure> {
    let mut found = Vec::new();
    for repository in repositories(game)?.into_iter().filter(|r| r.path.is_dir()) {
        let answer = kit::run_hearing(TOOL, &list_arguments(&repository.path), listener)?;
        let changelogs = &answer["data"]["changelogs"];
        if changelogs.as_array().is_some_and(|list| !list.is_empty()) {
            found.push(RepositoryChanges { repository: repository.name, changelogs: changelogs.clone() });
        }
    }
    Ok(found)
}

fn list_arguments(root: &Path) -> Vec<String> {
    vec![
        TOOL.to_owned(),
        LIST.to_owned(),
        "--root".to_owned(),
        root.display().to_string(),
        "--versions".to_owned(),
        VERSIONS.to_owned(),
        "--json".to_owned(),
    ]
}

/// A changelog's path inside a repository: relative, forward slashes, no step upwards, ending in the changelog's file name.
/// Folder names may hold spaces, as some games' mod folders do.
pub fn changelog_path(path: &str) -> bool {
    !path.is_empty()
        && path.len() <= MAX_PATH
        && !path.starts_with(['/', '-'])
        && !path.contains(['\\', ':', '\0', '\n', '\r'])
        && path.split('/').all(|part| !part.is_empty() && part != "." && part != "..")
        && path.rsplit('/').next() == Some(CHANGELOG_NAME)
}

pub fn entry_arguments(root: &Path, changelog: &str, text: &str) -> Result<Vec<String>, String> {
    if !changelog_path(changelog) {
        return Err(format!("{changelog:?} is not a changelog's path in a repository"));
    }
    let text = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if text.is_empty() || text.chars().count() > MAX_TEXT {
        return Err("that entry's text is empty or too long to look for".to_owned());
    }
    Ok(vec![
        TOOL.to_owned(),
        ENTRY.to_owned(),
        "--root".to_owned(),
        root.display().to_string(),
        "--changelog".to_owned(),
        changelog.to_owned(),
        // One argument, so text that opens with a dash is never read as an option.
        format!("--text={text}"),
        "--json".to_owned(),
    ])
}

/// The code of one commit, with every entry it wrote into the changelog: for a fact on the Timeline page, whose entries may since
/// have been reworded or removed. The changelog may be one the repository no longer has; the kit checks the commit is there.
pub fn commit_arguments(root: &Path, changelog: &str, commit: &str) -> Result<Vec<String>, String> {
    if !changelog_path(changelog) {
        return Err(format!("{changelog:?} is not a changelog's path in a repository"));
    }
    if !crate::history_page::commit_hash(commit) {
        return Err(format!("{commit:?} is not a commit"));
    }
    Ok(vec![
        TOOL.to_owned(),
        ENTRY.to_owned(),
        "--root".to_owned(),
        root.display().to_string(),
        "--changelog".to_owned(),
        changelog.to_owned(),
        format!("--commit={commit}"),
        "--json".to_owned(),
    ])
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
    let refused = |detail: String| Failure::new(FailureCode::Refused, detail);
    let found = repositories(game)?
        .into_iter()
        .find(|r| r.name == repository)
        .ok_or_else(|| refused(format!("{repository} is not one of this game's repositories")))?;
    let arguments = match commit {
        Some(commit) => commit_arguments(&found.path, changelog, commit),
        None => entry_arguments(&found.path, changelog, text),
    }
    .map_err(refused)?;
    let answer = kit::run_hearing(TOOL, &arguments, listener)?;
    Ok(result_of(&answer, repository))
}

fn result_of(answer: &Value, repository: &str) -> EntryCode {
    let data = &answer["data"];
    EntryCode {
        found: data["ok"] != Value::Bool(false),
        refusal: data["refusal"].as_str().map(str::to_owned),
        code: data.clone(),
        command_line: format!("python -m phobos_modkit changes entry   (on {repository})"),
    }
}

#[cfg(test)]
#[path = "tests/changes_page.rs"]
mod tests;
