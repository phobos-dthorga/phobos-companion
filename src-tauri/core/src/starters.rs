//! Starter files for a repository (0.89.0; the owner's choice by card, 25 Nov 2026: "Starter files for a repository"): the
//! few files the Companion's pages read from a repository, offered where one is missing. Game-free: the starters are data,
//! `config/repository-starters.json`.
//!
//! **A starter is written only where its path is free**, opened as a new file so nothing already there is ever replaced, inside
//! the repository's own folder, and only for an id the file names. What a repository has is read, never changed otherwise.

use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::Path;
use std::sync::OnceLock;

const STARTERS: &str = include_str!("../../../config/repository-starters.json");
/// Where a changelog may sit below the repository's root, and the folders never looked in: as the tool kit's `changes` finds them.
pub const CHANGELOG: &str = "CHANGELOG.md";
pub const SEARCH_DEPTH: usize = 3;
const SKIP_FOLDERS: [&str; 8] =
    ["node_modules", "external", "obj", "bin", "target", "dist", "artifacts", "__pycache__"];
const MAX_CONTENT: usize = 4_000;

/// How the Companion knows a repository already has a starter's kind of file.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Present {
    /// Any changelog up to `SEARCH_DEPTH` folders down.
    Changelog,
    /// The starter's own path.
    File,
}

/// One starter file, as `config/repository-starters.json` gives it.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Starter {
    pub id: String,
    pub path: String,
    pub present: Present,
    /// Ticked when offered.
    pub chosen: bool,
    /// Offered only while the features for AI agent sessions are shown.
    pub for_agents: bool,
    pub content: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct File {
    #[allow(dead_code)]
    about: String,
    starters: Vec<Starter>,
}

/// A path inside a repository, written with `/`: relative, no `..`, no drive, nothing hidden but what git itself keeps.
pub fn plain_path(path: &str) -> bool {
    !path.is_empty()
        && !path.starts_with('/')
        && !path.contains('\\')
        && !path.contains(':')
        && path.split('/').all(|part| !part.is_empty() && part != "." && part != ".." && !part.starts_with('.'))
}

/// The starters, checked: ids unique and plain, paths inside the repository, content of a sane size.
pub fn checked(text: &str) -> Result<Vec<Starter>, String> {
    let file: File = serde_json::from_str(text).map_err(|e| e.to_string())?;
    let mut seen: Vec<&str> = Vec::new();
    for starter in &file.starters {
        let id_ok = !starter.id.is_empty() && starter.id.bytes().all(|b| b.is_ascii_lowercase() || b == b'-');
        if !id_ok || seen.contains(&starter.id.as_str()) {
            return Err(format!("{:?} is not a plain id, or is named twice", starter.id));
        }
        seen.push(&starter.id);
        if !plain_path(&starter.path) {
            return Err(format!("{}: {:?} is not a plain path inside a repository", starter.id, starter.path));
        }
        if starter.content.is_empty() || starter.content.len() > MAX_CONTENT {
            return Err(format!("{}: its content is empty or too long", starter.id));
        }
    }
    Ok(file.starters)
}

/// The starters the Companion carries.
pub fn starters() -> &'static [Starter] {
    static READ: OnceLock<Vec<Starter>> = OnceLock::new();
    READ.get_or_init(|| checked(STARTERS).unwrap_or_default())
}

/// Whether a repository has a changelog where the tool kit looks for them.
pub fn has_changelog(root: &Path) -> bool {
    let mut stack = vec![(root.to_path_buf(), 0)];
    while let Some((folder, depth)) = stack.pop() {
        let Ok(entries) = fs::read_dir(&folder) else { continue };
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().into_owned();
            let Ok(kind) = entry.file_type() else { continue };
            if kind.is_file() && name == CHANGELOG {
                return true;
            }
            if kind.is_dir() && depth < SEARCH_DEPTH && !name.starts_with('.') && !SKIP_FOLDERS.contains(&name.as_str())
            {
                stack.push((entry.path(), depth + 1));
            }
        }
    }
    false
}

/// Whether a repository already has a starter's kind of file.
pub fn present(root: &Path, starter: &Starter) -> bool {
    match starter.present {
        Present::Changelog => has_changelog(root),
        Present::File => root.join(&starter.path).exists(),
    }
}

/// Writes one starter into a repository, only where its path is free: opened as a new file, so an existing one is never
/// replaced, its folders made as needed. The repository must be a folder already.
pub fn write(root: &Path, starter: &Starter) -> Result<(), String> {
    if !plain_path(&starter.path) {
        return Err(format!("{:?} is not a plain path inside a repository", starter.path));
    }
    if !root.is_dir() {
        return Err(format!("{} is not a folder", root.display()));
    }
    let path = root.join(&starter.path);
    if present(root, starter) {
        return Err(format!("{} already has one", root.display()));
    }
    if let Some(folder) = path.parent() {
        fs::create_dir_all(folder).map_err(|e| format!("{}: {e}", folder.display()))?;
    }
    // The folder made must still be the repository's own: no link out of it on the way.
    let inside = path
        .parent()
        .and_then(|folder| folder.canonicalize().ok())
        .zip(root.canonicalize().ok())
        .is_some_and(|(folder, root)| folder.starts_with(root));
    if !inside {
        return Err(format!("{} would be outside the repository", starter.path));
    }
    let mut file = OpenOptions::new().write(true).create_new(true).open(&path).map_err(|e| match e.kind() {
        ErrorKind::AlreadyExists => format!("{} is already there", starter.path),
        _ => format!("{}: {e}", path.display()),
    })?;
    file.write_all(starter.content.as_bytes()).map_err(|e| format!("{}: {e}", path.display()))
}

#[cfg(test)]
#[path = "tests/starters.rs"]
mod tests;
