//! A memory mark from the game (0.98.0; the owner's answer on the Decisions page, "Add a key that works in the game"): while a
//! watch runs, one key held with Ctrl or Alt (Ctrl+Alt+M unless changed in Settings) marks the moment at once, without leaving the
//! game, with the words the window gave ("Marked from the game"); words can be added on the Memory page afterwards.
//!
//! The key is the system's, so it is taken only while the Memory page says a watch runs, and let go when it says one does not, when
//! the page asks, or when the program closes. A press runs the same `memory_page::mark` as the page's own Mark it, through the
//! kit's manifest, and tells the window through the channel it gave. Tauri's global shortcut plugin does the listening.
//!
//! A recording from the game (0.118.0; the owner's choice by card, 28 Nov 2026, `docs/performance.md` P6): a second key
//! (Ctrl+Alt+P unless changed) is taken for the chosen game while the program runs, and a press records the running game for
//! `performance_page::KEY_SECONDS` at once, the press being the owner's own go-ahead. Each key is held for its own purpose, so
//! taking or letting go of one never touches the other.

use crate::memory_page;
use crate::performance_page;
use companion_core::failure::Failure;
use serde::Serialize;
use std::str::FromStr;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::ipc::Channel;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const MAX_WORDS: usize = 120;

/// What a key is held for.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Purpose {
    /// Marks the running memory watch.
    Mark,
    /// Records the running game.
    Record,
}

/// The keys taken, each for its purpose.
static TAKEN: Mutex<Vec<(Purpose, Shortcut)>> = Mutex::new(Vec::new());

/// What a press from the game started, then what it made (0.118.0).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Recorded {
    pub at: f64,
    /// False when the press was heard and the recording began; true once it has ended, made or refused.
    pub ended: bool,
    pub ok: bool,
    pub refusal: Option<String>,
    /// The recording made, once it has ended.
    pub recording: Option<String>,
}

/// What a press from the game did, for the window.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Marked {
    pub at: f64,
    pub ok: bool,
    pub refusal: Option<String>,
}

/// The key in the plugin's words: the window's `Ctrl+Alt+m` as `Ctrl+Alt+M`. Refused unless it is held with Ctrl or Alt, so a
/// key the game uses alone is never taken from it.
pub fn plugin_key(key: &str) -> Result<String, String> {
    let parts: Vec<&str> = key.split('+').map(str::trim).collect();
    let (last, held) = parts.split_last().ok_or_else(|| "no key named".to_owned())?;
    let held: Vec<&str> = held.to_vec();
    if !held.iter().any(|h| matches!(*h, "Ctrl" | "Alt")) {
        return Err(format!("{key} is not held with Ctrl or Alt, so the game would lose it"));
    }
    if held.iter().any(|h| !matches!(*h, "Ctrl" | "Alt" | "Shift")) {
        return Err(format!("{key} holds something other than Ctrl, Alt and Shift"));
    }
    let plain = last.len() == 1 && last.chars().all(|c| c.is_ascii_alphanumeric());
    if !plain {
        return Err(format!("{key} ends in something other than a letter or a digit"));
    }
    Ok(format!("{}+{}", held.join("+"), last.to_ascii_uppercase()))
}

fn now() -> f64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs_f64()).unwrap_or_default()
}

fn release_for(app: &AppHandle, purpose: Purpose) {
    if let Ok(mut taken) = TAKEN.lock() {
        taken.retain(|(held, shortcut)| {
            if *held == purpose {
                let _ = app.global_shortcut().unregister(*shortcut);
                false
            } else {
                true
            }
        });
    }
}

fn shortcut_of(key: &str) -> Result<Shortcut, Failure> {
    Shortcut::from_str(&plugin_key(key).map_err(Failure::refused)?)
        .map_err(|e| Failure::refused(format!("{key} is not a key the system knows: {e}")))
}

fn keep(purpose: Purpose, shortcut: Shortcut) {
    if let Ok(mut taken) = TAKEN.lock() {
        taken.push((purpose, shortcut));
    }
}

/// Lets go of the memory watch's key, if it is taken.
pub fn release(app: &AppHandle) {
    release_for(app, Purpose::Mark);
}

/// Lets go of the recording key, if it is taken (0.118.0).
pub fn release_record(app: &AppHandle) {
    release_for(app, Purpose::Record);
}

/// Takes the key that records a game from inside it (0.118.0): a press records it at once, told to `channel` as it starts and
/// again when it ends. A press while a recording runs is refused in words. Any recording key taken before is let go first.
pub fn take_record(app: &AppHandle, game: &str, key: &str, channel: Channel<Recorded>) -> Result<(), Failure> {
    let shortcut = shortcut_of(key)?;
    release_record(app);
    let game = game.to_owned();
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state() != ShortcutState::Pressed {
                return;
            }
            let (game, channel, at) = (game.clone(), channel.clone(), now());
            std::thread::spawn(move || {
                if performance_page::recording_now() {
                    let refusal = Some("a recording is already running; it ends in a minute or so".to_owned());
                    let _ = channel.send(Recorded { at, ended: true, ok: false, refusal, recording: None });
                    return;
                }
                // 0.122.1: a game whose tools cannot record it is told so at once, never "recording" first.
                if let Err(failure) = performance_page::check_record(&game) {
                    let _ = channel.send(Recorded {
                        at,
                        ended: true,
                        ok: false,
                        refusal: Some(failure.detail),
                        recording: None,
                    });
                    return;
                }
                let _ = channel.send(Recorded { at, ended: false, ok: true, refusal: None, recording: None });
                let ended =
                    match performance_page::record(&game, performance_page::KEY_SECONDS, false, FROM_THE_GAME, None) {
                        Ok(reading) => {
                            let refusal = reading.data["refusal"].as_str().map(str::to_owned);
                            let recording = reading.data["recording"].as_str().map(str::to_owned);
                            Recorded {
                                at,
                                ended: true,
                                ok: refusal.is_none() && recording.is_some(),
                                refusal,
                                recording,
                            }
                        }
                        Err(failure) => {
                            Recorded { at, ended: true, ok: false, refusal: Some(failure.detail), recording: None }
                        }
                    };
                let _ = channel.send(ended);
            });
        })
        .map_err(|e| Failure::refused(format!("{key} could not be taken: another program may hold it ({e})")))?;
    keep(Purpose::Record, shortcut);
    Ok(())
}

/// The label a recording from the game's key is given.
const FROM_THE_GAME: &str = "from the game";

/// Takes the key for a game's running watch: a press marks the moment with `words` and tells `channel`. Any key taken before is let
/// go first.
pub fn take(app: &AppHandle, game: &str, key: &str, words: &str, channel: Channel<Marked>) -> Result<(), Failure> {
    let words = companion_core::checks::one_line(words);
    if words.is_empty() || words.chars().count() > MAX_WORDS {
        return Err(Failure::refused("a mark from the game needs a few words"));
    }
    let shortcut = shortcut_of(key)?;
    release(app);
    let game = game.to_owned();
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state() != ShortcutState::Pressed {
                return;
            }
            let (game, words, channel, at) = (game.clone(), words.clone(), channel.clone(), now());
            std::thread::spawn(move || {
                let marked = match memory_page::mark(&game, None, &words, Some(at)) {
                    Ok(result) => Marked { at, ok: result.ok, refusal: result.refusal },
                    Err(failure) => Marked { at, ok: false, refusal: Some(failure.detail) },
                };
                let _ = channel.send(marked);
            });
        })
        .map_err(|e| Failure::refused(format!("{key} could not be taken: another program may hold it ({e})")))?;
    keep(Purpose::Mark, shortcut);
    Ok(())
}

#[cfg(test)]
#[path = "tests/game_key.rs"]
mod tests;
