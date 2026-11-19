//! Screen notes, "something's off" (the owner's go-ahead, 19 Nov 2026; `docs/later.md`, item 1): one key on any page saves the page's
//! picture, its address, the owner's words (or none), this program's version and the window's size, into a folder of its own in
//! this program's data folder, `screen-notes/<id>/` (`picture.png`, `note.json`). Agent sessions read them at the start with the
//! kit's `screen-notes list`, and mark one dealt with by writing `resolved.json` beside it; nothing here or there deletes a note.
//! This module writes only inside that folder, and shows a note's picture in the file manager.

use crate::pictures;
use companion_core::failure::{Failure, FailureCode};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::fs;
use std::path::{Path, PathBuf};

/// The folder in this program's data folder that holds the notes; the kit's `screen-notes` reads the same one.
pub const FOLDER: &str = "screen-notes";
const NOTE_FILE: &str = "note.json";
const RESOLVED_FILE: &str = "resolved.json";
const PICTURE_FILE: &str = "picture.png";
const NOTE_FORMAT: u32 = 1;
const MAX_WORDS: usize = 4000;
const MAX_ADDRESS: usize = 4000;
const MAX_SHORT: usize = 200;
const MAX_SAME_SECOND: u32 = 999;
/// How many dealt-with notes Home shows, newest first, so the owner sees what was done about them.
pub const DEALT_SHOWN: usize = 5;

/// What the window sends with a note's picture, as JSON in the `x-screen-note` header (percent-encoded).
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct NoteRequest {
    /// The owner's local time, `20261119-101500`: the note's name, so notes sort by when they were taken.
    pub stamp: String,
    pub game: String,
    pub page: String,
    pub address: String,
    pub words: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Resolved {
    pub time: String,
    pub how: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Note {
    pub id: String,
    pub time: String,
    pub game: String,
    pub page: String,
    pub address: String,
    pub words: String,
    pub has_picture: bool,
    pub resolved: Option<Resolved>,
}

/// The open notes, newest first, and the newest few dealt with.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Notes {
    pub open: Vec<Note>,
    pub dealt: Vec<Note>,
    pub dealt_count: usize,
}

/// A note's name: `YYYYMMDD-HHMMSS`, with `-2` up to `-999` when two land in one second.
pub fn is_note_id(id: &str) -> bool {
    let (stamp, extra) = id.split_at(id.len().min(15));
    let digits = |part: &str| !part.is_empty() && part.bytes().all(|b| b.is_ascii_digit());
    let stamp_ok = stamp.len() == 15 && digits(&stamp[..8]) && &stamp[8..9] == "-" && digits(&stamp[9..]);
    stamp_ok && (extra.is_empty() || (extra.starts_with('-') && extra.len() <= 4 && digits(&extra[1..])))
}

/// Checks what the window sent before anything is written.
pub fn check(request: &NoteRequest) -> Result<(), String> {
    if !is_note_id(&request.stamp) || request.stamp.len() != 15 {
        return Err("a note's time must look like 20261119-101500".to_owned());
    }
    if request.words.chars().count() > MAX_WORDS {
        return Err(format!("keep the words under {MAX_WORDS} characters"));
    }
    if request.address.chars().count() > MAX_ADDRESS {
        return Err("the page's address is too long".to_owned());
    }
    if [&request.game, &request.page].iter().any(|text| text.chars().count() > MAX_SHORT) {
        return Err("the game or page is too long".to_owned());
    }
    Ok(())
}

/// The first free name for a note taken at this stamp.
fn free_id(folder: &Path, stamp: &str) -> Option<String> {
    std::iter::once(stamp.to_owned())
        .chain((2..=MAX_SAME_SECOND).map(|n| format!("{stamp}-{n}")))
        .find(|id| !folder.join(id).exists() && !folder.join(format!("{id}.partial")).exists())
}

/// Writes a note's folder: the picture and `note.json`, beside its place first and then moved, so a half-written note is never
/// read. `version` is this program's own. Returns the note's name.
pub fn save(data: &Path, request: &NoteRequest, version: &str, picture: &[u8], time: &str) -> Result<String, Failure> {
    pictures::check_png(picture).map_err(Failure::refused)?;
    check(request).map_err(Failure::refused)?;
    let folder = data.join(FOLDER);
    let failed =
        |problem: std::io::Error| Failure::new(FailureCode::WriteFailed, format!("{}: {problem}", folder.display()));
    fs::create_dir_all(&folder).map_err(failed)?;
    let id = free_id(&folder, &request.stamp)
        .ok_or_else(|| Failure::refused("too many notes in one second; wait a moment and try again"))?;
    let partial = folder.join(format!("{id}.partial"));
    let note = json!({
        "format": NOTE_FORMAT,
        "time": time,
        "game": request.game,
        "page": request.page,
        "address": request.address,
        "words": request.words.trim(),
        "version": version,
        "window": {"width": request.width, "height": request.height},
    });
    let written = fs::create_dir_all(&partial)
        .and_then(|()| fs::write(partial.join(PICTURE_FILE), picture))
        .and_then(|()| fs::write(partial.join(NOTE_FILE), format!("{:#}\n", note)))
        .and_then(|()| fs::rename(&partial, folder.join(&id)));
    if let Err(problem) = written {
        let _ = fs::remove_dir_all(&partial);
        return Err(failed(problem));
    }
    Ok(id)
}

fn read_json(path: &Path) -> Option<Value> {
    serde_json::from_str::<Value>(&fs::read_to_string(path).ok()?).ok().filter(Value::is_object)
}

fn text(value: &Value, key: &str) -> String {
    value[key].as_str().unwrap_or_default().to_owned()
}

fn read_note(where_: &Path, id: &str) -> Option<Note> {
    let note = read_json(&where_.join(NOTE_FILE))?;
    let resolved = read_json(&where_.join(RESOLVED_FILE))
        .map(|done| Resolved { time: text(&done, "time"), how: text(&done, "how") });
    Some(Note {
        id: id.to_owned(),
        time: text(&note, "time"),
        game: text(&note, "game"),
        page: text(&note, "page"),
        address: text(&note, "address"),
        words: text(&note, "words"),
        has_picture: where_.join(PICTURE_FILE).is_file(),
        resolved,
    })
}

/// Every note in the folder: the open ones, newest first, and the newest dealt with. A missing folder is no notes.
pub fn list(data: &Path) -> Notes {
    let mut all: Vec<Note> = fs::read_dir(data.join(FOLDER))
        .map(|entries| {
            entries
                .flatten()
                .filter_map(|entry| {
                    let name = entry.file_name().to_string_lossy().into_owned();
                    (is_note_id(&name) && entry.path().is_dir()).then(|| read_note(&entry.path(), &name)).flatten()
                })
                .collect()
        })
        .unwrap_or_default();
    all.sort_by(|a, b| (&b.time, &b.id).cmp(&(&a.time, &a.id)));
    let (dealt, open): (Vec<Note>, Vec<Note>) = all.into_iter().partition(|note| note.resolved.is_some());
    let dealt_count = dealt.len();
    Notes { open, dealt: dealt.into_iter().take(DEALT_SHOWN).collect(), dealt_count }
}

/// A note's folder, once its name is checked.
pub fn note_folder(data: &Path, id: &str) -> Result<PathBuf, Failure> {
    if !is_note_id(id) {
        return Err(Failure::refused("that is not a note's name"));
    }
    Ok(data.join(FOLDER).join(id))
}

/// Shows a note's picture in the file manager, selected.
pub fn show(data: &Path, id: &str) -> Result<(), Failure> {
    let folder = note_folder(data, id)?;
    pictures::show(&folder, &folder.join(PICTURE_FILE))
}

#[cfg(test)]
#[path = "tests/screen_notes.rs"]
mod tests;
