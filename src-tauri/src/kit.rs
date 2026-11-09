//! The one way to the tools: run the pinned phobos-modkit as a process and read its JSON envelope.

use crate::failure::{Failure, FailureCode};
use crate::process::hide_console;
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
const MANIFEST: &str = "manifest";

/// What the window is told about the tools.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct KitStatus {
    pub kit_version: String,
    pub tools: usize,
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

/// Runs a kit command that prints an envelope, and returns it. The command's own exit code does not decide: a tool may
/// report a finding with exit 1 and still print its report, so only a missing or unreadable answer is a failure.
pub fn run(tool: &str, arguments: &[String]) -> Result<Value, Failure> {
    let folder = kit_folder();
    if !folder.join(PACKAGE).is_dir() {
        return Err(Failure::new(FailureCode::KitMissing, folder.display().to_string()));
    }
    let mut command = Command::new(python());
    command.args(["-m", PACKAGE]).args(arguments).current_dir(&folder).env("PYTHONDONTWRITEBYTECODE", "1");
    hide_console(&mut command);
    let output = command.output().map_err(|problem| {
        let code =
            if problem.kind() == ErrorKind::NotFound { FailureCode::PythonMissing } else { FailureCode::ToolFailed };
        Failure::new(code, problem.to_string())
    })?;
    match parse_envelope(&output.stdout, tool) {
        Err(_) if !output.status.success() => {
            Err(Failure::new(FailureCode::ToolFailed, String::from_utf8_lossy(&output.stderr).into_owned()))
        }
        answer => answer,
    }
}

/// The kit's description of every command.
pub fn read_manifest() -> Result<Value, Failure> {
    let arguments = [MANIFEST.to_owned(), "--json".to_owned()];
    run(MANIFEST, &arguments)
}

/// Reads the kit's manifest and says how many tools it holds.
pub fn read_status() -> Result<KitStatus, Failure> {
    status_of(&read_manifest()?)
}

fn parse_envelope(stdout: &[u8], tool: &str) -> Result<Value, Failure> {
    let unreadable = |detail: &str| Failure::new(FailureCode::Unreadable, detail);
    let value: Value = serde_json::from_slice(stdout).map_err(|problem| unreadable(&problem.to_string()))?;
    if value["envelope"].as_u64() != Some(ENVELOPE_FORMAT) {
        return Err(unreadable("the envelope's format is not one this program knows"));
    }
    if value["tool"].as_str() != Some(tool) {
        return Err(unreadable("the answer came from a different tool"));
    }
    Ok(value)
}

fn status_of(value: &Value) -> Result<KitStatus, Failure> {
    let unreadable = |detail: &str| Failure::new(FailureCode::Unreadable, detail);
    let kit_version = value["kit_version"].as_str().ok_or_else(|| unreadable("the answer names no kit version"))?;
    let commands = value["data"]["commands"].as_array().ok_or_else(|| unreadable("the answer lists no commands"))?;
    Ok(KitStatus { kit_version: kit_version.to_owned(), tools: commands.len() })
}

#[cfg(test)]
#[path = "tests/kit.rs"]
mod tests;
