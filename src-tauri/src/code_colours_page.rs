//! Code colours from VS Code (0.77.0; docs/code-reading.md, step 2), as Settings → Appearance offers them: the kept sets in the
//! program's own folder, the themes VS Code and the editors built from it have installed, and Windows' Open dialog for any other.
//! `companion_core::code_colours` decides everything; this module only finds folders and opens the dialog. The one path the window
//! may name is a theme the listing of installed themes named, and it is checked against a fresh listing before it is read.

use crate::pick::{self, Filter};
use crate::themes_page;
use companion_core::code_colours::{self, Installed, Status};
use companion_core::failure::Failure;
use companion_core::themes::{self, Theme};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const FILTER: Filter = Filter { name: "VS Code themes", extensions: &["json", "jsonc"] };

/// The folder in the program's own folder where kept sets and the choice live; the records backup copies it with the rest.
pub fn folder(data: &Path) -> PathBuf {
    data.join("code-colours")
}

fn theme(data: &Path) -> Theme {
    themes::status(&themes_page::folder(data)).active
}

pub fn status(data: &Path) -> Status {
    code_colours::status(&folder(data), &theme(data))
}

pub fn choose(data: &Path, id: &str) -> Result<Status, Failure> {
    code_colours::choose(&folder(data), id, &theme(data))
}

pub fn remove(data: &Path, id: &str) -> Result<Status, Failure> {
    code_colours::remove(&folder(data), id, &theme(data))
}

/// Where VS Code and the editors built from it (VS Code Insiders, VSCodium, Cursor) keep extensions, on Windows, Linux and macOS:
/// each a folder of extension folders. Only folders that exist are given.
pub fn roots() -> Vec<PathBuf> {
    let env = |key: &str| std::env::var_os(key).map(PathBuf::from);
    let mut installs: Vec<PathBuf> = Vec::new();
    if let Some(local) = env("LOCALAPPDATA") {
        for name in ["Microsoft VS Code", "Microsoft VS Code Insiders", "VSCodium", "cursor"] {
            installs.push(local.join("Programs").join(name));
        }
    }
    for key in ["ProgramFiles", "ProgramFiles(x86)"] {
        if let Some(programs) = env(key) {
            for name in ["Microsoft VS Code", "VSCodium"] {
                installs.push(programs.join(name));
            }
        }
    }
    for path in [
        "/usr/share/code",
        "/usr/lib/code",
        "/opt/visual-studio-code",
        "/usr/share/codium",
        "/Applications/Visual Studio Code.app/Contents",
        "/Applications/VSCodium.app/Contents",
        "/Applications/Cursor.app/Contents",
    ] {
        installs.push(PathBuf::from(path));
    }
    let extensions = |base: &Path| base.join("resources").join("app").join("extensions");
    let mut roots = Vec::new();
    for install in installs {
        roots.push(extensions(&install));
        // Newer Windows installs keep each version in a folder of its own beside the program.
        if let Ok(entries) = fs::read_dir(&install) {
            roots.extend(entries.flatten().map(|entry| extensions(&entry.path())));
        }
    }
    if let Some(home) = env("USERPROFILE").or_else(|| env("HOME")) {
        for name in [".vscode", ".vscode-insiders", ".vscode-oss", ".cursor"] {
            roots.push(home.join(name).join("extensions"));
        }
    }
    roots.retain(|root| root.is_dir());
    roots.dedup();
    roots
}

pub fn installed() -> Vec<Installed> {
    code_colours::installed(&roots())
}

/// What bringing a theme in did: the code colours as they now are, and the file read, or none when the dialog was closed.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Moved {
    pub status: Status,
    pub file: Option<String>,
}

/// Brings in one of the installed themes, named by the file the listing gave, under the label VS Code shows for it.
pub fn bring_in_installed(data: &Path, file: &str) -> Result<Moved, Failure> {
    let listed = installed();
    let found = listed.iter().find(|theme| theme.file == file).ok_or_else(|| {
        Failure::refused(format!("{file} is not a theme the VS Code on this computer lists, so it was not read"))
    })?;
    keep(data, Path::new(&found.file), Some(&found.label))
}

/// Brings in a VS Code theme file the person chooses in Windows' Open dialog.
pub fn bring_in_file(app: &tauri::AppHandle, data: &Path, title: &str) -> Result<Moved, Failure> {
    let Some(path) = pick::open_file(app, title, &FILTER)? else {
        return Ok(Moved { status: status(data), file: None });
    };
    keep(data, &path, None)
}

fn keep(data: &Path, path: &Path, label: Option<&str>) -> Result<Moved, Failure> {
    let set = code_colours::read_file(path, label)
        .map_err(|why| Failure::refused(format!("{} was not brought in: {why}", path.display())))?;
    let status = code_colours::keep(&folder(data), &set, &theme(data))?;
    Ok(Moved { status, file: Some(path.display().to_string()) })
}
