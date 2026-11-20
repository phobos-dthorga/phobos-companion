//! Themes (0.33.0), as the Settings page's Appearance offers them: the program's own and the owner's, which to use, a theme file
//! brought in or saved elsewhere, and one the owner made. `companion_core::themes` decides everything; this module only finds the
//! program's own folder and opens Windows' own Open and Save dialogs, so the window never names a path to read or write.

use crate::pick::{self, Filter};
use companion_core::failure::{Failure, FailureCode};
use companion_core::themes::{self, Status};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const FILTER: Filter = Filter { name: "Theme files", extensions: &["json"] };

/// The themes folder in the program's own folder, where the owner's themes and choice are kept.
pub fn folder(data: &Path) -> PathBuf {
    data.join("themes")
}

/// What an Open or Save did: the themes as they now are, and the file, or nothing when the dialog was closed.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Moved {
    pub status: Status,
    pub file: Option<String>,
}

/// Brings in a theme file the owner chooses in Windows' Open dialog, checks it, keeps it and uses it.
pub fn import(app: &tauri::AppHandle, data: &Path, title: &str) -> Result<Moved, Failure> {
    let folder = folder(data);
    let Some(path) = pick::open_file(app, title, &FILTER)? else {
        return Ok(Moved { status: themes::status(&folder), file: None });
    };
    let size = fs::metadata(&path).map_err(|problem| Failure::refused(format!("{}: {problem}", path.display())))?.len();
    if size > themes::MAX_BYTES as u64 {
        return Err(Failure::refused(format!("{} is larger than any theme, so it was not read", path.display())));
    }
    let text = fs::read_to_string(&path)
        .map_err(|problem| Failure::new(FailureCode::Unreadable, format!("{}: {problem}", path.display())))?;
    let status = themes::keep(&folder, &text)
        .map_err(|failure| Failure::refused(format!("{} was not brought in: {}", path.display(), failure.detail)))?;
    Ok(Moved { status, file: Some(path.display().to_string()) })
}

/// Saves a theme on offer where the owner chooses in Windows' Save dialog, as a file anyone can bring in.
pub fn export(app: &tauri::AppHandle, data: &Path, id: &str, title: &str) -> Result<Moved, Failure> {
    let folder = folder(data);
    let theme = themes::export(&folder, id)?;
    save(app, &folder, &theme, title)
}

/// Saves a theme being made, before or without keeping it: only its shape is checked, so a draft can be finished later.
pub fn export_draft(app: &tauri::AppHandle, data: &Path, text: &str, title: &str) -> Result<Moved, Failure> {
    let theme = themes::parse(text, false).map_err(Failure::refused)?;
    save(app, &folder(data), &theme, title)
}

fn save(app: &tauri::AppHandle, folder: &Path, theme: &themes::Theme, title: &str) -> Result<Moved, Failure> {
    let Some(path) = pick::save_file(app, title, &format!("{}.json", theme.id), &FILTER)? else {
        return Ok(Moved { status: themes::status(folder), file: None });
    };
    themes::write_file(&path, &theme.to_file())?;
    Ok(Moved { status: themes::status(folder), file: Some(path.display().to_string()) })
}
