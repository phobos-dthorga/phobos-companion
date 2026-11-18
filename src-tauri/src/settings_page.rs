//! The Settings page: every path the tools read, its value and where that value comes from, and the central settings file.
//!
//! It runs the kit's `settings`, naming every repository on the owner's list, so the settings a repository declares for its own
//! scripts are listed and each repository's own values shown. Setting or clearing one writes only the central settings file (the
//! kit's `settings set`), only when the owner presses Save or Use the default, and only while the kit's manifest still calls that
//! report `writes`. The host checks the key and the value before the kit sees either; the kit checks them again.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit::{self, Outcome};
use serde::Serialize;
use serde_json::Value;
use std::path::PathBuf;

const TOOL: &str = "settings";
const LIST: &str = "list";
const SET: &str = "set";

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

/// Every repository on the owner's list that is on this PC, each once.
fn roots() -> Result<Vec<PathBuf>, Failure> {
    Ok(games::every_repository()?.into_iter().map(|r| r.path).filter(|path| path.is_dir()).collect())
}

pub fn list_arguments(roots: &[PathBuf]) -> Vec<String> {
    // The full paths, not shortened to ~: the page shows them to be changed, and the kit refuses a value that is not a full path.
    Args::new(TOOL, LIST).roots(roots.iter().map(PathBuf::as_path)).flag("--no-redact").json()
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

pub fn set_arguments(key: &str, value: Option<&str>, roots: &[PathBuf]) -> Result<Vec<String>, String> {
    if !checks::setting_key(key) {
        return Err(format!("{key:?} is not a setting's name"));
    }
    let arguments = Args::new(TOOL, SET).given("--key", key).roots(roots.iter().map(PathBuf::as_path));
    let arguments = match value {
        Some(value) if checks::setting_value(value) => arguments.given("--value", value.trim()),
        Some(_) => return Err("a setting's value is one full path".to_owned()),
        None => arguments.flag("--clear"),
    };
    Ok(arguments.json())
}

/// Sets one setting in the central file, or clears it when no value is given.
pub fn set(key: &str, value: Option<&str>, listener: Option<kit::Listener>) -> Result<SetResult, Failure> {
    kit::allowed_by_manifest(&kit::read_manifest()?, TOOL, SET).map_err(Failure::refused)?;
    let arguments = set_arguments(key, value, &roots()?).map_err(Failure::refused)?;
    let answer = kit::run_hearing(TOOL, &arguments, listener)?;
    Ok(result_of(&answer))
}

fn result_of(answer: &Value) -> SetResult {
    let outcome = Outcome::of(answer);
    SetResult {
        ok: outcome.ok,
        refusal: outcome.refusal,
        central_file: answer["data"]["centralFile"].as_str().map(str::to_owned),
    }
}

#[cfg(test)]
#[path = "tests/settings_page.rs"]
mod tests;
