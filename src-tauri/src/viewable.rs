//! Pictures and sounds the window may be handed whole, wherever they are on this PC (0.53.0; the owner's choice of 23 Nov 2026 to
//! show pictures and sounds on the Mods page, beside the Mod list's mods and for encoded textures, as the code viewer does).
//!
//! The rule is the screenshots' (0.32.0): the host hands over only a file a kit answer named in this run of the program, of a kind
//! the window can draw or play, at most 64 MB. Each page's host module passes its answer here as it arrives; the window then asks
//! for one of those files by its path. Nothing is written.

use companion_core::failure::Failure;
use serde_json::Value;
use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// The largest file handed over whole (agent default, as for screenshots and the code viewer).
pub const MAX_BYTES: u64 = 64 * 1024 * 1024;

/// What the window draws or plays, by extension: the code viewer's pictures, DDS textures and sounds.
const KINDS: [&str; 16] = [
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif", "svg", "dds", "ogg", "opus", "wav", "mp3", "flac", "m4a",
];

/// Every viewable file a kit answer named in this run.
static VIEWABLE: Mutex<BTreeSet<PathBuf>> = Mutex::new(BTreeSet::new());

/// Whether the window can draw or play a file, by its extension.
pub fn is_viewable(path: &Path) -> bool {
    path.extension().and_then(|e| e.to_str()).is_some_and(|e| KINDS.contains(&e.to_ascii_lowercase().as_str()))
}

/// Keeps the viewable ones among these paths.
pub fn remember(paths: impl IntoIterator<Item = PathBuf>) {
    if let Ok(mut known) = VIEWABLE.lock() {
        known.extend(paths.into_iter().filter(|path| is_viewable(path)));
    }
}

fn known(path: &Path) -> bool {
    VIEWABLE.lock().map(|known| known.contains(path)).unwrap_or(false)
}

/// One named file's bytes, for the window to draw or play.
pub fn bytes(path: &str) -> Result<Vec<u8>, Failure> {
    let path = PathBuf::from(path);
    if !known(&path) || !is_viewable(&path) {
        return Err(Failure::refused("only a picture or a sound a page listed can be shown"));
    }
    let unreadable = |problem: std::io::Error| Failure::refused(format!("{}: {problem}", path.display()));
    let size = fs::metadata(&path).map_err(unreadable)?.len();
    if size > MAX_BYTES {
        return Err(Failure::refused(format!("{} is too large to show here", path.display())));
    }
    fs::read(&path).map_err(unreadable)
}

fn text(value: &Value) -> Option<&str> {
    value.as_str().filter(|text| !text.is_empty())
}

/// The installs answer's changed files, in each copy that holds them: installed, the repository's and every backup.
pub fn in_installs(status: &Value) -> Vec<PathBuf> {
    let mut found = Vec::new();
    for state in status["mods"].as_array().map_or(&[][..], Vec::as_slice) {
        let folders: Vec<PathBuf> = [&state["installed"], &state["repository"]]
            .into_iter()
            .chain(state["backups"].as_array().map_or(&[][..], Vec::as_slice))
            .filter_map(|copy| text(&copy["folder"]).map(PathBuf::from))
            .collect();
        for file in state["files"]["paths"].as_array().map_or(&[][..], Vec::as_slice) {
            if let Some(relative) = text(&file["path"]).filter(|p| plain_relative(p)) {
                found.extend(folders.iter().map(|folder| folder.join(relative)));
            }
        }
    }
    found
}

/// Each mod's own picture in the Mod list's listing.
pub fn in_mod_list(listing: &Value) -> Vec<PathBuf> {
    listing["mods"]
        .as_array()
        .map_or(&[][..], Vec::as_slice)
        .iter()
        .filter_map(|m| text(&m["preview"]))
        .map(PathBuf::from)
        .collect()
}

/// Each picture and encoded texture of a texture-pairs answer, inside the mod's folder.
pub fn in_pairs(answer: &Value) -> Vec<PathBuf> {
    let Some(folder) = text(&answer["folder"]).map(PathBuf::from) else { return Vec::new() };
    answer["pairs"]
        .as_array()
        .map_or(&[][..], Vec::as_slice)
        .iter()
        .flat_map(|pair| [text(&pair["picture"]), text(&pair["encoded"])])
        .flatten()
        .filter(|relative| plain_relative(relative))
        .map(|relative| folder.join(relative))
        .collect()
}

/// A path inside a folder, as the kit writes one: relative, forward slashes, no step upwards.
fn plain_relative(path: &str) -> bool {
    !path.starts_with(['/', '\\']) && !path.contains(':') && path.split(['/', '\\']).all(|part| part != "..")
}

#[cfg(test)]
#[path = "tests/viewable.rs"]
mod tests;
