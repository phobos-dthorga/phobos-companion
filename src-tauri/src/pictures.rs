//! Pictures of a page to share (the owner's request, 19 Nov 2026: "many of the things that I observe in Companion, I wish to share
//! with Hiddensoul and my other friends"). The window draws the whole page, scrolled parts included, into a PNG and sends its bytes;
//! the host checks they are a PNG of a sensible size and writes them into one folder of the owner's Pictures, `D'thorga Companion`,
//! never anywhere else, and can show a picture there in the file manager. Nothing else is read or changed.

use companion_core::failure::{Failure, FailureCode};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

/// The folder inside the owner's Pictures that every picture goes into.
pub const FOLDER: &str = "D'thorga Companion";
const PNG_SIGNATURE: [u8; 8] = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
/// The largest picture taken: a very long page at twice the screen's resolution stays well under this.
const MAX_BYTES: usize = 64 * 1024 * 1024;
const MAX_NAME: usize = 100;
const FALLBACK_NAME: &str = "D'thorga Companion";

/// A file name from the window's words: letters, digits, spaces and a few marks kept, the rest made spaces, one line, not too long.
pub fn clean_name(name: &str) -> String {
    let kept: String =
        name.chars().map(|c| if c.is_alphanumeric() || " -_.,'()&+".contains(c) { c } else { ' ' }).collect();
    let joined = kept.split_whitespace().collect::<Vec<_>>().join(" ");
    let trimmed: String = joined.trim_matches(|c: char| c == '.' || c == ' ').chars().take(MAX_NAME).collect();
    if trimmed.is_empty() { FALLBACK_NAME.to_owned() } else { trimmed }
}

/// The window sends a picture's name percent-encoded (a header carries plain ASCII only); this undoes it, keeping what it cannot read.
pub fn decode_name(encoded: &str) -> String {
    let bytes = encoded.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%'
            && i + 2 < bytes.len()
            && let Some(value) = encoded.get(i + 1..i + 3).and_then(|hex| u8::from_str_radix(hex, 16).ok())
        {
            out.push(value);
            i += 3;
            continue;
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Checks the bytes are a PNG of a sensible size.
pub fn check_png(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() > MAX_BYTES {
        return Err(format!("the picture is larger than {} MB", MAX_BYTES / (1024 * 1024)));
    }
    if bytes.len() < PNG_SIGNATURE.len() || bytes[..PNG_SIGNATURE.len()] != PNG_SIGNATURE {
        return Err("that is not a PNG picture".to_owned());
    }
    Ok(())
}

/// A free path in the folder for this name: "Name.png", else "Name 2.png", "Name 3.png"...
pub fn free_path(folder: &Path, name: &str) -> PathBuf {
    let first = folder.join(format!("{name}.png"));
    if !first.exists() {
        return first;
    }
    (2..).map(|n| folder.join(format!("{name} {n}.png"))).find(|path| !path.exists()).expect("some number is free")
}

/// Writes a picture into the folder and returns where it went. Written beside its place first, then moved, so a half-written
/// picture never sits under the real name.
pub fn save(folder: &Path, name: &str, bytes: &[u8]) -> Result<PathBuf, Failure> {
    check_png(bytes).map_err(Failure::refused)?;
    let failed =
        |problem: std::io::Error| Failure::new(FailureCode::WriteFailed, format!("{}: {problem}", folder.display()));
    fs::create_dir_all(folder).map_err(failed)?;
    let path = free_path(folder, &clean_name(name));
    let partial = path.with_extension("png.partial");
    fs::write(&partial, bytes).map_err(failed)?;
    fs::rename(&partial, &path).map_err(|problem| {
        let _ = fs::remove_file(&partial);
        failed(problem)
    })?;
    Ok(path)
}

/// Shows a saved picture in the file manager, selected. Only a picture inside the folder is shown.
pub fn show(folder: &Path, path: &Path) -> Result<(), Failure> {
    let inside = path.parent().is_some_and(|parent| parent == folder)
        && path.extension().is_some_and(|e| e == "png")
        && path.is_file();
    if !inside {
        return Err(Failure::refused("only a picture this program saved can be shown"));
    }
    select_in_file_manager(path)
}

/// Explorer's argument to open a folder with one file selected: `/select,` then the path in quotes of its own. Passed whole, a
/// path with a space made the argument `"/select,C:\a b\c"`, which Explorer does not read, so it opened Documents instead, every
/// time (the owner's report of 27 Nov 2026, since the earliest versions; 0.108.0). A Windows path can hold no `"`.
pub fn select_argument(path: &Path) -> String {
    format!("/select,\"{}\"", path.display())
}

/// Opens the file manager with the file selected (on Linux, its folder). The caller checks the path is one it may show.
pub fn select_in_file_manager(path: &Path) -> Result<(), Failure> {
    #[cfg(target_os = "windows")]
    let started = {
        use std::os::windows::process::CommandExt;
        Command::new("explorer").raw_arg(select_argument(path)).spawn()
    };
    #[cfg(target_os = "macos")]
    let started = Command::new("open").arg("-R").arg(path).spawn();
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let started = Command::new("xdg-open").arg(path.parent().unwrap_or(path)).spawn();
    started.map(|_| ()).map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))
}

#[cfg(test)]
#[path = "tests/pictures.rs"]
mod tests;
