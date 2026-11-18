//! The one way to the tools: run the pinned phobos-modkit as a process and read its JSON envelope.

use crate::failure::{Failure, FailureCode};
use crate::process::hide_console;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::env;
use std::io::{BufRead, BufReader, ErrorKind, Read};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;

const ENVELOPE_FORMAT: u64 = 1;
const KIT_FOLDER_VARIABLE: &str = "PHOBOS_COMPANION_KIT";
const PYTHON_VARIABLE: &str = "PHOBOS_COMPANION_PYTHON";
const DEFAULT_PYTHON: &str = "python";
const PACKAGE: &str = "phobos_modkit";
const MANIFEST: &str = "manifest";
const PROGRESS_VARIABLE: &str = "PHOBOS_MODKIT_PROGRESS";
const PROGRESS_OPENING: &str = "{\"progress\":";

/// One progress line from a working tool (phobos-modkit `docs/manifest.md`, Progress): what it is doing now, how far along when
/// it can count, and a line of the work's own output.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct Progress {
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub step: Option<u64>,
    #[serde(default)]
    pub of: Option<u64>,
    #[serde(default)]
    pub detail: Option<String>,
}

/// Something that hears progress as it comes.
pub type Listener<'a> = &'a (dyn Fn(Progress) + Sync);

/// A line of a tool's standard error as progress, or None when it is the tool's own text.
pub fn parse_progress(line: &str) -> Option<Progress> {
    let line = line.trim();
    if !line.starts_with(PROGRESS_OPENING) {
        return None;
    }
    serde_json::from_str(line).ok()
}

/// What the window is told about the tools.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct KitStatus {
    pub kit_version: String,
    pub tools: usize,
}

/// The kit's Python folder. A packaged program will carry its own copy; for now it is the submodule it was built from.
fn kit_folder() -> PathBuf {
    env::var_os(KIT_FOLDER_VARIABLE)
        .map(PathBuf::from)
        .unwrap_or_else(|| crate::repository_root().join("external").join("phobos-modkit").join("python"))
}

fn python() -> String {
    env::var(PYTHON_VARIABLE).unwrap_or_else(|_| DEFAULT_PYTHON.to_owned())
}

/// Runs a kit command that prints an envelope, and returns it. The command's own exit code does not decide: a tool may
/// report a finding with exit 1 and still print its report, so only a missing or unreadable answer is a failure.
pub fn run(tool: &str, arguments: &[String]) -> Result<Value, Failure> {
    run_hearing(tool, arguments, None)
}

/// Runs a kit command as `run` does, and passes each progress line it writes to the listener while it works. Standard output is
/// read on its own thread, so a tool that fills one pipe never waits on the other.
pub fn run_hearing(tool: &str, arguments: &[String], listener: Option<Listener>) -> Result<Value, Failure> {
    let folder = kit_folder();
    if !folder.join(PACKAGE).is_dir() {
        return Err(Failure::new(FailureCode::KitMissing, folder.display().to_string()));
    }
    let mut command = Command::new(python());
    command
        .args(["-m", PACKAGE])
        .args(arguments)
        .current_dir(&folder)
        .env("PYTHONDONTWRITEBYTECODE", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if listener.is_some() {
        command.env(PROGRESS_VARIABLE, "1");
    } else {
        command.env_remove(PROGRESS_VARIABLE);
    }
    hide_console(&mut command);
    let mut child = command.spawn().map_err(|problem| {
        let code =
            if problem.kind() == ErrorKind::NotFound { FailureCode::PythonMissing } else { FailureCode::ToolFailed };
        Failure::new(code, problem.to_string())
    })?;
    let failed = |problem: std::io::Error| Failure::new(FailureCode::ToolFailed, problem.to_string());
    let mut stdout = child.stdout.take().expect("standard output was piped");
    let stderr = child.stderr.take().expect("standard error was piped");
    let answer = thread::spawn(move || {
        let mut bytes = Vec::new();
        stdout.read_to_end(&mut bytes).map(|_| bytes)
    });
    let mut said = String::new();
    let mut reader = BufReader::new(stderr);
    let mut raw = Vec::new();
    while reader.read_until(b'\n', &mut raw).map_err(failed)? > 0 {
        let line = String::from_utf8_lossy(&raw);
        match (parse_progress(&line), listener) {
            (Some(progress), Some(hear)) => hear(progress),
            (Some(_), None) => {}
            (None, _) => said.push_str(&line),
        }
        raw.clear();
    }
    let status = child.wait().map_err(failed)?;
    let bytes = answer.join().map_err(|_| Failure::new(FailureCode::ToolFailed, "the answer could not be read"))?;
    match parse_envelope(&bytes.map_err(failed)?, tool) {
        Err(_) if !status.success() => Err(Failure::new(FailureCode::ToolFailed, said)),
        answer => answer,
    }
}

/// Whether the kit did what it was asked: one rule for every answer. A tool that refuses says so with `ok: false` and its reason in
/// `refusal`; an answer without `ok` is a report, which succeeded.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Outcome {
    pub ok: bool,
    pub refusal: Option<String>,
}

impl Outcome {
    pub fn of(answer: &Value) -> Self {
        let data = &answer["data"];
        Self { ok: data["ok"] != Value::Bool(false), refusal: data["refusal"].as_str().map(str::to_owned) }
    }

    /// A refusal as a failure, for a reading the page cannot show without.
    pub fn required(answer: &Value) -> Result<(), Failure> {
        let outcome = Self::of(answer);
        if outcome.ok {
            Ok(())
        } else {
            Err(Failure::new(FailureCode::ToolFailed, outcome.refusal.unwrap_or_default()))
        }
    }
}

const ALLOWED_EFFECTS: [&str; 2] = ["writes", "runs"];

/// The kit's manifest still says this report writes or runs (never owner-only, never one it does not have): checked before every
/// change the program makes for the owner.
pub fn allowed_by_manifest(manifest: &Value, command: &str, report: &str) -> Result<(), String> {
    let commands = manifest["data"]["commands"].as_array().map_or(&[][..], Vec::as_slice);
    let found = commands
        .iter()
        .find(|c| c["name"].as_str() == Some(command))
        .and_then(|c| c["reports"].as_array())
        .and_then(|reports| reports.iter().find(|r| r["name"].as_str() == Some(report)))
        .ok_or_else(|| format!("the tool kit has no {command} {report}"))?;
    let effect = found["effect"].as_str().unwrap_or_default();
    if ALLOWED_EFFECTS.contains(&effect) {
        Ok(())
    } else {
        Err(format!("the tool kit says {command} {report} is {effect:?}, which this program does not run"))
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
