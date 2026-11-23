//! Going online (0.61.0; `docs/online.md`): one switch for each kind of call the program makes to the internet by itself, kept in
//! `online.json` in the program's own folder, written whole (`prefs`).
//!
//! **Each kind starts on for the repositories on the games list** (the owner, 23 Nov 2026: "On for listed repositories with a
//! setting to disable otherwise, with applicable warnings of severe loss of functionality"), and the person can switch it off.
//! Off means off: the host makes no call of that kind, by itself or on a press, and the page says the kind is off. Each kind
//! names what it contacts and what stops working without it, which the Settings panel shows before the switch is turned off.

use crate::failure::Failure;
use crate::prefs;
use serde::Serialize;
use serde_json::json;
use std::path::Path;

const FILE: &str = "online.json";
const KEY: &str = "kinds";
const VERSION: u64 = 1;

/// How much is lost when a kind is switched off: the panel warns before a severe one is switched off.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Loss {
    Small,
    Severe,
}

/// One kind of call the program makes by itself. Its words are the window's (`online-<id>-…` in the locale file).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Kind {
    pub id: &'static str,
    /// The address it contacts, as a person would recognise it.
    pub contacts: &'static str,
    pub loss: Loss,
}

/// Every kind, in the order the panel lists them. A new kind joins here, in the locale file and in the Guide in one change.
pub const KINDS: [Kind; 5] = [
    Kind { id: "gate-lights", contacts: "api.github.com", loss: Loss::Severe },
    // The nightly watch's findings, read from each repository's results branch (0.63.0, `docs/online.md` O3).
    Kind { id: "nightly-watch", contacts: "raw.githubusercontent.com", loss: Loss::Severe },
    // Known problems between mods, read from each repository's published feeds/ for the Mod list check (0.64.0, O2).
    Kind { id: "known-problems", contacts: "raw.githubusercontent.com", loss: Loss::Severe },
    // Another author's existing issues, listed on a press on the Logs page (0.65.0, O4). Opening a new-issue form is the
    // browser's own visit, not a call of the program's, so it has no switch.
    Kind { id: "their-reports", contacts: "api.github.com", loss: Loss::Small },
    // Each Workshop item read back from Steam's public API (keyless) on the Publish page's Read Steam back (0.69.0,
    // `docs/publishing.md`): its visibility and the day it went public. Uploading is the owner's press, not a call of this kind.
    Kind { id: "workshop-pages", contacts: "api.steampowered.com", loss: Loss::Small },
];

/// One kind as it stands: on or off, and whether that is the person's choice or the default.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct KindStatus {
    pub id: String,
    pub contacts: String,
    pub loss: Loss,
    pub on: bool,
    pub chosen: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Status {
    pub kinds: Vec<KindStatus>,
}

fn kept(data: &Path) -> serde_json::Map<String, serde_json::Value> {
    match prefs::read_json(&data.join(FILE)) {
        Ok(Some(serde_json::Value::Object(map))) => map,
        _ => serde_json::Map::new(),
    }
}

/// Each kind, on unless the person switched it off. A file that can't be read leaves every kind at its default: on, as the owner
/// chose; the next choice writes the file whole.
pub fn status(data: &Path) -> Status {
    let choices = kept(data).get(KEY).and_then(|v| v.as_object()).cloned().unwrap_or_default();
    let kinds = KINDS
        .iter()
        .map(|kind| {
            let chosen = choices.get(kind.id).and_then(serde_json::Value::as_bool);
            KindStatus {
                id: kind.id.to_owned(),
                contacts: kind.contacts.to_owned(),
                loss: kind.loss,
                on: chosen.unwrap_or(true),
                chosen: chosen.is_some(),
            }
        })
        .collect();
    Status { kinds }
}

/// Whether the program may make this kind of call by itself.
pub fn is_on(data: &Path, id: &str) -> bool {
    status(data).kinds.iter().any(|kind| kind.id == id && kind.on)
}

/// Keeps the person's choice for one kind, refusing a kind the program does not have.
pub fn choose(data: &Path, id: &str, on: bool) -> Result<Status, Failure> {
    if !KINDS.iter().any(|kind| kind.id == id) {
        return Err(Failure::refused(format!("\"{id}\" is not a kind of call this program makes")));
    }
    let mut file = kept(data);
    let mut choices = file.get(KEY).and_then(|v| v.as_object()).cloned().unwrap_or_default();
    choices.insert(id.to_owned(), json!(on));
    file.insert("version".into(), json!(VERSION));
    file.insert(KEY.into(), serde_json::Value::Object(choices));
    prefs::write_json(&data.join(FILE), &serde_json::Value::Object(file))?;
    Ok(status(data))
}

#[cfg(test)]
#[path = "tests/online.rs"]
mod tests;
