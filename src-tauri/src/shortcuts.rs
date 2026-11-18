//! The owner's keyboard shortcuts: which key does what, kept in `shortcuts.json` in this program's own folder. The window holds the
//! defaults and the actions; this file holds only what the owner changed, and whether shortcuts are on at all. The host checks the
//! shape of what the window sends before writing it.

use companion_core::failure::Failure;
use companion_core::prefs;
use serde_json::Value;
use std::path::{Path, PathBuf};

const FILE: &str = "shortcuts.json";
const FORMAT: u64 = 1;
const MAX_ACTIONS: usize = 200;
const MAX_ACTION: usize = 60;
const MAX_KEY: usize = 40;

pub fn file(data: &Path) -> PathBuf {
    data.join(FILE)
}

/// What the owner saved; None before they change anything.
pub fn read(data: &Path) -> Result<Option<Value>, Failure> {
    prefs::read_json(&file(data))
}

/// Writes the owner's shortcuts, once their shape is right.
pub fn save(data: &Path, shortcuts: &Value) -> Result<Value, Failure> {
    let checked = checked(shortcuts).map_err(Failure::refused)?;
    prefs::write_json(&file(data), &checked)?;
    Ok(checked)
}

fn action_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= MAX_ACTION
        && name.starts_with(|c: char| c.is_ascii_lowercase())
        && name.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || matches!(c, '.' | '-'))
}

fn key_name(key: &str) -> bool {
    !key.is_empty() && key.chars().count() <= MAX_KEY && !key.chars().any(char::is_control)
}

/// `{"format": 1, "enabled": true, "keys": {"page.timeline": "7", "code.next-file": null}}`: a key for an action, or null to turn
/// it off. Anything else is refused in words.
pub fn checked(value: &Value) -> Result<Value, String> {
    if value["format"].as_u64() != Some(FORMAT) {
        return Err("the shortcuts are not in a form this program knows".to_owned());
    }
    let enabled = value["enabled"].as_bool().ok_or("the shortcuts do not say whether they are on")?;
    let keys = value["keys"].as_object().ok_or("the shortcuts name no keys")?;
    if keys.len() > MAX_ACTIONS {
        return Err("there are more shortcuts than this program has actions".to_owned());
    }
    for (action, key) in keys {
        if !action_name(action) {
            return Err(format!("{action:?} is not an action's name"));
        }
        match key {
            Value::Null => {}
            Value::String(key) if key_name(key) => {}
            _ => return Err(format!("the key for {action} is not one key")),
        }
    }
    Ok(serde_json::json!({"format": FORMAT, "enabled": enabled, "keys": keys}))
}

#[cfg(test)]
#[path = "tests/shortcuts.rs"]
mod tests;
