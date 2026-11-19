//! Windows' own folder and file pickers (0.29.0; owner, 20 Nov 2026: "file dialog window pickers ... especially where ever a
//! directory needs to be chosen"), through Tauri's dialog plugin. The picker only answers with a path: saving it is the same
//! `set_setting` a typed path goes through, so the kit still checks it. Its address bar takes a pasted path too.

use std::path::{Path, PathBuf};

use companion_core::checks;
use companion_core::failure::Failure;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// What is being picked.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Folder,
    File,
}

impl Kind {
    pub fn named(kind: &str) -> Result<Self, Failure> {
        match kind {
            "folder" => Ok(Self::Folder),
            "file" => Ok(Self::File),
            other => Err(Failure::refused(format!("{other:?} is not something a picker chooses: a folder or a file"))),
        }
    }
}

/// The longest title a picker shows; the window gives it from its own words.
const MAX_TITLE: usize = 120;

/// Where the picker opens: the current value's folder when there is one, else the nearest folder above it that exists.
pub fn start_folder(current: Option<&str>) -> Option<PathBuf> {
    let current = current.map(str::trim).filter(|value| !value.is_empty())?;
    let mut path = Path::new(current.trim_matches('"'));
    loop {
        if path.is_dir() {
            return Some(path.to_path_buf());
        }
        path = path.parent()?;
    }
}

/// Opens the picker and waits for it. None when the owner closes it without choosing.
pub fn pick(app: &AppHandle, kind: Kind, title: &str, current: Option<&str>) -> Result<Option<String>, Failure> {
    let title = checks::one_line(title);
    if title.chars().count() > MAX_TITLE {
        return Err(Failure::refused("a picker's title is one short line"));
    }
    let mut dialog = app.dialog().file().set_title(title);
    if let Some(folder) = start_folder(current) {
        dialog = dialog.set_directory(folder);
    }
    let chosen = match kind {
        Kind::Folder => dialog.blocking_pick_folder(),
        Kind::File => dialog.blocking_pick_file(),
    };
    match chosen {
        None => Ok(None),
        Some(path) => path.into_path().map(|path| Some(path.to_string_lossy().into_owned())).map_err(|problem| {
            Failure::refused(format!("the picker gave something that is not a path on this PC ({problem})"))
        }),
    }
}

#[cfg(test)]
#[path = "tests/pick.rs"]
mod tests;
