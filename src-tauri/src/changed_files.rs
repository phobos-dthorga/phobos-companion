//! The files that aren't text behind a changelog entry (0.50.0; the owner, 22 Nov 2026: "We should support the ability to display
//! multimedia in parts like this", of the code viewer, which could only say a changed picture "isn't text").
//!
//! The code viewer draws pictures and textures and plays sounds itself, from the bytes this hands it: each file as it stood before
//! the change (the commit's parent, or the last commit for changes in no commit yet) and after it (the commit, or the file on disk).
//! It also saves a copy of either side where the owner chooses in Windows' own Save dialog, and opens a copy with the program the
//! system uses for that kind of file, both only on the owner's press.
//!
//! What it checks: only a file the kit's last answer for that repository and commit named as binary, of a sane size, read with git
//! (which takes no lock), or from the repository's own folder for changes in no commit yet. A copy is opened only for a kind the
//! kit named as media (picture, texture, sound, video, model, font, document, archive), never a program or a kind it did not know,
//! so a press can never run something; the copy is written into this program's own folder, `opened-copies`, and copies there more
//! than a day old are let go when the next one is made.

use companion_core::checks;
use companion_core::failure::{Failure, FailureCode};
use companion_core::games;
use companion_core::git;
use serde_json::Value;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::time::{Duration, SystemTime};

/// The largest file handed to the window whole (agent default, as for screenshots): a game's largest textures are well under it.
pub const MAX_BYTES: u64 = 64 * 1024 * 1024;
/// The folder in this program's own data folder that opened copies are written into.
pub const OPENED: &str = "opened-copies";
/// How long an opened copy is kept before the next one lets it go (agent default): long enough to finish looking.
const KEEP_OPENED: Duration = Duration::from_secs(24 * 60 * 60);
/// The kinds a copy may be opened as: never a program, and never a kind the kit did not know.
const OPENABLE: [&str; 8] = ["picture", "texture", "sound", "video", "model", "font", "document", "archive"];

/// What the kit said of one file that isn't text.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Named {
    pub old_path: Option<String>,
    pub change: String,
    pub media: String,
}

/// A repository's folder and the commit a set of files came from; None for changes in no commit yet.
type Key = (PathBuf, Option<String>);

/// Every binary file an answer named in this run of the program: the only files handed over.
static NAMED: Mutex<BTreeMap<Key, BTreeMap<String, Named>>> = Mutex::new(BTreeMap::new());

/// Keeps the binary files of one `changes entry` answer, by the repository's folder and the answer's commit.
pub fn remember(root: &Path, data: &Value) {
    let commit = data["commit"]["hash"].as_str().filter(|hash| checks::commit_hash(hash)).map(str::to_owned);
    let files: BTreeMap<String, Named> = data["files"]
        .as_array()
        .map_or(&[][..], Vec::as_slice)
        .iter()
        .filter(|file| file["binary"].as_bool() == Some(true))
        .filter_map(|file| {
            let path = file["path"].as_str()?.to_owned();
            let named = Named {
                old_path: file["oldPath"].as_str().map(str::to_owned),
                change: file["change"].as_str().unwrap_or("changed").to_owned(),
                media: file["media"].as_str().unwrap_or("other").to_owned(),
            };
            Some((path, named))
        })
        .collect();
    if let Ok(mut known) = NAMED.lock() {
        known.insert((root.to_path_buf(), commit), files);
    }
}

/// Which side of a change.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Before,
    After,
}

impl Side {
    pub fn named(side: &str) -> Result<Self, Failure> {
        match side {
            "before" => Ok(Self::Before),
            "after" => Ok(Self::After),
            other => Err(Failure::refused(format!("{other:?} is not a side of a change: before or after"))),
        }
    }

    fn words(self) -> &'static str {
        match self {
            Self::Before => "before",
            Self::After => "after",
        }
    }
}

/// Where one side of a file is.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Source {
    /// A revision and the file's path in it.
    Revision(String, String),
    /// The file on disk, for changes in no commit yet.
    Disk(PathBuf),
    /// That side has no such file: a file added has no before, one removed no after.
    Missing,
}

pub fn source(root: &Path, commit: Option<&str>, path: &str, named: &Named, side: Side) -> Source {
    match side {
        Side::Before if named.change == "added" => Source::Missing,
        Side::Before => {
            let revision = commit.map_or_else(|| "HEAD".to_owned(), |hash| format!("{hash}^"));
            Source::Revision(revision, named.old_path.clone().unwrap_or_else(|| path.to_owned()))
        }
        Side::After if named.change == "removed" => Source::Missing,
        Side::After => match commit {
            Some(hash) => Source::Revision(hash.to_owned(), path.to_owned()),
            None => Source::Disk(root.join(path)),
        },
    }
}

/// The repository and what the kit said of a file, when an answer in this run named it; refused in words otherwise.
fn named_file(game: &str, repository: &str, commit: Option<&str>, path: &str) -> Result<(PathBuf, Named), Failure> {
    if commit.is_some_and(|hash| !checks::commit_hash(hash)) {
        return Err(Failure::refused("that is not a commit"));
    }
    if !checks::repository_file(path) {
        return Err(Failure::refused(format!("{path:?} is not a file's path in a repository")));
    }
    let root = games::named_repository(game, repository)?.path;
    let key = (root.clone(), commit.map(str::to_owned));
    let named = NAMED.lock().ok().and_then(|known| known.get(&key).and_then(|files| files.get(path)).cloned());
    let named = named.ok_or_else(|| Failure::refused("only a file the code viewer listed can be read"))?;
    Ok((root, named))
}

fn read(root: &Path, commit: Option<&str>, path: &str, named: &Named, side: Side) -> Result<Vec<u8>, Failure> {
    let missing = || Failure::refused(format!("{path} has no {} side: it was {}", side.words(), named.change));
    match source(root, commit, path, named, side) {
        Source::Missing => Err(missing()),
        Source::Revision(revision, file) => git::file_at(root, &revision, &file, MAX_BYTES)
            .map_err(|failed| Failure::refused(failed.detail))?
            .ok_or_else(missing),
        Source::Disk(file) => {
            let unreadable = |problem: std::io::Error| Failure::refused(format!("{path}: {problem}"));
            let size = fs::metadata(&file).map_err(unreadable)?.len();
            if size > MAX_BYTES {
                return Err(Failure::refused(format!("{path} is too large to read here")));
            }
            fs::read(&file).map_err(unreadable)
        }
    }
}

/// One side of a file the code viewer listed, as bytes for the window to draw or play.
pub fn bytes(game: &str, repository: &str, commit: Option<&str>, path: &str, side: &str) -> Result<Vec<u8>, Failure> {
    let side = Side::named(side)?;
    let (root, named) = named_file(game, repository, commit, path)?;
    read(&root, commit, path, &named, side)
}

/// The name a copy is offered under: "Tipper_ArmouredCab_north (before).png", with the commit's first characters when given.
pub fn copy_name(path: &str, side: Side, commit: Option<&str>) -> String {
    let name = path.rsplit('/').next().unwrap_or(path);
    let (stem, extension) = match name.rsplit_once('.') {
        Some((stem, extension)) if !stem.is_empty() => (stem, Some(extension)),
        _ => (name, None),
    };
    let marked = match commit {
        Some(hash) => format!("{stem} ({} {})", side.words(), &hash[..hash.len().min(8)]),
        None => format!("{stem} ({})", side.words()),
    };
    extension.map_or(marked.clone(), |extension| format!("{marked}.{extension}"))
}

fn extension_of(path: &str) -> String {
    path.rsplit('/')
        .next()
        .and_then(|name| name.rsplit_once('.'))
        .map(|(_, e)| e.to_ascii_lowercase())
        .unwrap_or_default()
}

/// Saves one side of a listed file where the owner chooses in Windows' Save dialog; None when they close it without choosing.
pub fn save(
    app: &tauri::AppHandle,
    game: &str,
    repository: &str,
    commit: Option<&str>,
    path: &str,
    side: &str,
    title: &str,
) -> Result<Option<String>, Failure> {
    let side = Side::named(side)?;
    let (root, named) = named_file(game, repository, commit, path)?;
    let data = read(&root, commit, path, &named, side)?;
    let extension = extension_of(path);
    let one = [extension.as_str()];
    let extensions: &[&str] = if extension.is_empty() { &[] } else { &one };
    let name = format!("{} (*.{extension})", extension.to_ascii_uppercase());
    let filter = crate::pick::Filter { name: &name, extensions };
    let Some(target) = crate::pick::save_file(app, title, &copy_name(path, side, None), &filter)? else {
        return Ok(None);
    };
    fs::write(&target, data)
        .map_err(|problem| Failure::new(FailureCode::WriteFailed, format!("{}: {problem}", target.display())))?;
    Ok(Some(target.to_string_lossy().into_owned()))
}

/// Opens a copy of one side of a listed file with the program the system uses for its kind; only a kind the kit named as media.
pub fn open(
    data_folder: &Path,
    game: &str,
    repository: &str,
    commit: Option<&str>,
    path: &str,
    side: &str,
) -> Result<String, Failure> {
    let side = Side::named(side)?;
    let (root, named) = named_file(game, repository, commit, path)?;
    if !OPENABLE.contains(&named.media.as_str()) {
        return Err(Failure::refused(format!(
            "{path} is not a picture, sound, model or document, so it is not opened: it could be a program"
        )));
    }
    let data = read(&root, commit, path, &named, side)?;
    let folder = data_folder.join(OPENED);
    let failed =
        |problem: std::io::Error| Failure::new(FailureCode::WriteFailed, format!("{}: {problem}", folder.display()));
    fs::create_dir_all(&folder).map_err(failed)?;
    let_go_of_old(&folder, SystemTime::now());
    let target = folder.join(copy_name(path, side, commit));
    fs::write(&target, data).map_err(failed)?;
    open_with_system(&target)?;
    Ok(target.to_string_lossy().into_owned())
}

/// Lets go of copies in the opened-copies folder more than a day old: only plain files this program wrote there.
pub fn let_go_of_old(folder: &Path, now: SystemTime) {
    let Ok(entries) = fs::read_dir(folder) else { return };
    for entry in entries.flatten() {
        let old = entry
            .metadata()
            .ok()
            .filter(fs::Metadata::is_file)
            .and_then(|metadata| metadata.modified().ok())
            .and_then(|modified| now.duration_since(modified).ok())
            .is_some_and(|age| age > KEEP_OPENED);
        if old {
            let _ = fs::remove_file(entry.path());
        }
    }
}

fn open_with_system(path: &Path) -> Result<(), Failure> {
    let started = if cfg!(target_os = "windows") {
        Command::new("explorer").arg(path).spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg(path).spawn()
    } else {
        Command::new("xdg-open").arg(path).spawn()
    };
    started.map(|_| ()).map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))
}

#[cfg(test)]
#[path = "tests/changed_files.rs"]
mod tests;
