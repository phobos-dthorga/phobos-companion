//! The Settings page: every path the tools read, its value and where that value comes from, and the central settings file.
//!
//! It runs the kit's `settings`, naming every repository on the owner's list, so the settings a repository declares for its own
//! scripts are listed and each repository's own values shown. Setting or clearing one writes only the central settings file (the
//! kit's `settings set`), only when the owner presses Save or Use the default, and only while the kit's manifest still calls that
//! report `writes`. The host checks the key and the value before the kit sees either; the kit checks them again.

use crate::failure::{Failure, FailureCode};
use crate::games;
use crate::installs_page::allowed_by_manifest;
use crate::kit;
use serde::Serialize;
use serde_json::Value;
use std::path::PathBuf;

const TOOL: &str = "settings";
const LIST: &str = "list";
const SET: &str = "set";
const MAX_KEY: usize = 64;
const MAX_VALUE: usize = 500;

/// Every setting the tools read, as the kit lists them.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct SettingsReading {
    pub central_file: String,
    pub central_exists: bool,
    /// The kit's settings: each one's key, description, value, layer, and the central and default values.
    pub settings: Value,
}

/// What a press of Save or Use the default did.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct SetResult {
    pub ok: bool,
    pub refusal: Option<String>,
    pub central_file: Option<String>,
}

/// Every repository on the owner's list that is there, each once.
fn roots() -> Result<Vec<PathBuf>, Failure> {
    let mut found: Vec<PathBuf> = Vec::new();
    for game in games::load()?.unwrap_or_default() {
        for repository in game.repositories {
            if repository.path.is_dir() && !found.contains(&repository.path) {
                found.push(repository.path);
            }
        }
    }
    Ok(found)
}

fn with_roots(mut arguments: Vec<String>, roots: &[PathBuf]) -> Vec<String> {
    for root in roots {
        arguments.push("--root".to_owned());
        arguments.push(root.display().to_string());
    }
    arguments
}

pub fn list_arguments(roots: &[PathBuf]) -> Vec<String> {
    let mut arguments = with_roots(vec![TOOL.to_owned(), LIST.to_owned()], roots);
    // The full paths, not shortened to ~: the page shows them to be changed, and the kit refuses a value that is not a full path.
    arguments.extend(["--no-redact".to_owned(), "--json".to_owned()]);
    arguments
}

/// Every setting, with where each value comes from.
pub fn read(listener: Option<kit::Listener>) -> Result<SettingsReading, Failure> {
    let answer = kit::run_hearing(TOOL, &list_arguments(&roots()?), listener)?;
    let data = &answer["data"];
    Ok(SettingsReading {
        central_file: data["centralFile"].as_str().unwrap_or_default().to_owned(),
        central_exists: data["centralExists"].as_bool().unwrap_or(false),
        settings: data["settings"].clone(),
    })
}

/// A setting's name: letters and digits only, as the kit's keys are.
pub fn setting_key(key: &str) -> bool {
    !key.is_empty() && key.len() <= MAX_KEY && key.bytes().all(|b| b.is_ascii_alphanumeric())
}

/// A value to write: one line, of a sane length, not read as an option. The kit checks it is a full path.
pub fn setting_value(value: &str) -> bool {
    let value = value.trim();
    !value.is_empty()
        && value.chars().count() <= MAX_VALUE
        && !value.starts_with('-')
        && !value.contains(['\n', '\r', '\0'])
}

pub fn set_arguments(key: &str, value: Option<&str>, roots: &[PathBuf]) -> Result<Vec<String>, String> {
    if !setting_key(key) {
        return Err(format!("{key:?} is not a setting's name"));
    }
    let mut arguments = with_roots(vec![TOOL.to_owned(), SET.to_owned(), format!("--key={key}")], roots);
    match value {
        Some(value) if setting_value(value) => arguments.push(format!("--value={}", value.trim())),
        Some(_) => return Err("a setting's value is one full path".to_owned()),
        None => arguments.push("--clear".to_owned()),
    }
    arguments.push("--json".to_owned());
    Ok(arguments)
}

/// Sets one setting in the central file, or clears it when no value is given.
pub fn set(key: &str, value: Option<&str>, listener: Option<kit::Listener>) -> Result<SetResult, Failure> {
    let refused = |detail: String| Failure::new(FailureCode::Refused, detail);
    allowed_by_manifest(&kit::read_manifest()?, TOOL, SET).map_err(refused)?;
    let arguments = set_arguments(key, value, &roots()?).map_err(refused)?;
    let answer = kit::run_hearing(TOOL, &arguments, listener)?;
    Ok(result_of(&answer))
}

fn result_of(answer: &Value) -> SetResult {
    let data = &answer["data"];
    SetResult {
        ok: data["ok"] == Value::Bool(true),
        refusal: data["refusal"].as_str().map(str::to_owned),
        central_file: data["centralFile"].as_str().map(str::to_owned),
    }
}

#[cfg(test)]
#[path = "tests/settings_page.rs"]
mod tests;
