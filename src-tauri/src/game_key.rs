//! A memory mark from the game (0.98.0; the owner's answer on the Decisions page, "Add a key that works in the game"): while a
//! watch runs, one key held with Ctrl or Alt (Ctrl+Alt+M unless changed in Settings) marks the moment at once, without leaving the
//! game, with the words the window gave ("Marked from the game"); words can be added on the Memory page afterwards.
//!
//! The key is the system's, so it is taken only while the Memory page says a watch runs, and let go when it says one does not, when
//! the page asks, or when the program closes. A press runs the same `memory_page::mark` as the page's own Mark it, through the
//! kit's manifest, and tells the window through the channel it gave. Tauri's global shortcut plugin does the listening.

use crate::memory_page;
use companion_core::failure::Failure;
use serde::Serialize;
use std::str::FromStr;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::ipc::Channel;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const MAX_WORDS: usize = 120;

/// The key taken, and for which game.
static TAKEN: Mutex<Option<Shortcut>> = Mutex::new(None);

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

/// Lets go of the key, if one is taken.
pub fn release(app: &AppHandle) {
    if let Ok(mut taken) = TAKEN.lock()
        && let Some(shortcut) = taken.take()
    {
        let _ = app.global_shortcut().unregister(shortcut);
    }
}

/// Takes the key for a game's running watch: a press marks the moment with `words` and tells `channel`. Any key taken before is let
/// go first.
pub fn take(app: &AppHandle, game: &str, key: &str, words: &str, channel: Channel<Marked>) -> Result<(), Failure> {
    let words = companion_core::checks::one_line(words);
    if words.is_empty() || words.chars().count() > MAX_WORDS {
        return Err(Failure::refused("a mark from the game needs a few words"));
    }
    let shortcut = Shortcut::from_str(&plugin_key(key).map_err(Failure::refused)?)
        .map_err(|e| Failure::refused(format!("{key} is not a key the system knows: {e}")))?;
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
    if let Ok(mut taken) = TAKEN.lock() {
        *taken = Some(shortcut);
    }
    Ok(())
}

#[cfg(test)]
#[path = "tests/game_key.rs"]
mod tests;
