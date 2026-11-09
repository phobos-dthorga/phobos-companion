//! The one way to the tools: run the pinned phobos-modkit as a process and read its JSON envelope.

use serde::Serialize;
use serde_json::Value;
use std::env;
use std::io::ErrorKind;
use std::path::PathBuf;
use std::process::Command;

const ENVELOPE_FORMAT: u64 = 1;
const KIT_FOLDER_VARIABLE: &str = "PHOBOS_COMPANION_KIT";
const PYTHON_VARIABLE: &str = "PHOBOS_COMPANION_PYTHON";
const DEFAULT_PYTHON: &str = "python";
const PACKAGE: &str = "phobos_modkit";

/// What the window is told about the tools.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct KitStatus {
    pub kit_version: String,
    pub tools: usize,
}

/// Why the tools could not be read. The window turns the code into words.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum KitFailureCode {
    PythonMissing,
    KitMissing,
    ToolFailed,
    Unreadable,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct KitFailure {
    pub code: KitFailureCode,
    pub detail: String,
}

impl KitFailure {
    pub fn new(code: KitFailureCode, detail: impl Into<String>) -> Self {
        Self { code, detail: detail.into() }
    }
}

/// The kit's Python folder. A packaged program will carry its own copy; for now it is the submodule it was built from.
fn kit_folder() -> PathBuf {
    env::var_os(KIT_FOLDER_VARIABLE).map(PathBuf::from).unwrap_or_else(|| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("external").join("phobos-modkit").join("python")
    })
}

fn python() -> String {
    env::var(PYTHON_VARIABLE).unwrap_or_else(|_| DEFAULT_PYTHON.to_owned())
}

/// Reads the kit's manifest and says how many tools it holds.
pub fn read_status() -> Result<KitStatus, KitFailure> {
    let folder = kit_folder();
    if !folder.join(PACKAGE).is_dir() {
        return Err(KitFailure::new(KitFailureCode::KitMissing, folder.display().to_string()));
    }
    let mut command = Command::new(python());
    command.args(["-m", PACKAGE, "manifest", "--json"]).current_dir(&folder).env("PYTHONDONTWRITEBYTECODE", "1");
    hide_console(&mut command);
    let output = command.output().map_err(|problem| {
        let code = if problem.kind() == ErrorKind::NotFound {
            KitFailureCode::PythonMissing
        } else {
            KitFailureCode::ToolFailed
        };
        KitFailure::new(code, problem.to_string())
    })?;
    if !output.status.success() {
        return Err(KitFailure::new(KitFailureCode::ToolFailed, String::from_utf8_lossy(&output.stderr).into_owned()));
    }
    parse_manifest(&output.stdout)
}

/// A windowed program would otherwise flash a console for every tool it runs.
#[cfg(windows)]
fn hide_console(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_console(_command: &mut Command) {}

fn parse_manifest(stdout: &[u8]) -> Result<KitStatus, KitFailure> {
    let unreadable = |detail: &str| KitFailure::new(KitFailureCode::Unreadable, detail);
    let value: Value = serde_json::from_slice(stdout).map_err(|problem| unreadable(&problem.to_string()))?;
    if value["envelope"].as_u64() != Some(ENVELOPE_FORMAT) {
        return Err(unreadable("the envelope's format is not one this program knows"));
    }
    if value["tool"].as_str() != Some("manifest") {
        return Err(unreadable("the answer did not come from the manifest"));
    }
    let kit_version = value["kit_version"].as_str().ok_or_else(|| unreadable("the answer names no kit version"))?;
    let commands = value["data"]["commands"].as_array().ok_or_else(|| unreadable("the answer lists no commands"))?;
    Ok(KitStatus { kit_version: kit_version.to_owned(), tools: commands.len() })
}

#[cfg(test)]
#[path = "tests/kit.rs"]
mod tests;
