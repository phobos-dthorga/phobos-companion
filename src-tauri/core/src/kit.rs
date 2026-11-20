//! The one way to the tools: run the pinned phobos-modkit as a process and read its JSON envelope.

use crate::failure::{Failure, FailureCode};
use crate::process::hide_console;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::env;
use std::io::{BufRead, BufReader, ErrorKind, Read};
use std::path::{Path, PathBuf};
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
    /// Where the kit came from (0.35.0): "environment", "build-folder" or "installed".
    pub source: String,
}

/// Where the kit and the Python that runs it are, and which way they were found.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Runtime {
    pub kit: PathBuf,
    pub python: String,
    pub source: &'static str,
}

/// The kit's folder, the Python to run it with, and which way they were found (0.35.0): named by the environment; else beside
/// the repository this program was built from, when it is on this PC (the owner's, unchanged), with the Python on the PATH; else
/// what the installer brought: its own portable Python and kit. Kept free of the environment, for its tests.
pub fn locate(
    env_kit: Option<PathBuf>,
    env_python: Option<String>,
    built: Option<PathBuf>,
    installed: Option<&Path>,
) -> Runtime {
    let (kit, source) = match (env_kit, built, installed) {
        (Some(kit), _, _) => (kit, "environment"),
        (None, Some(root), _) => (root.join("external").join("phobos-modkit").join("python"), "build-folder"),
        (None, None, Some(runtime)) if runtime.join("kit").join(PACKAGE).is_dir() => (runtime.join("kit"), "installed"),
        (None, None, _) => {
            (crate::repository_root().join("external").join("phobos-modkit").join("python"), "build-folder")
        }
    };
    let own_python = installed.map(|runtime| runtime.join("python").join("python.exe")).filter(|path| path.is_file());
    let python = match (env_python, source, own_python) {
        (Some(python), _, _) => python,
        (None, "installed", Some(own)) => own.to_string_lossy().into_owned(),
        _ => DEFAULT_PYTHON.to_owned(),
    };
    Runtime { kit, python, source }
}

/// Where the kit and its Python are, on this PC, now.
pub fn runtime() -> Runtime {
    let built = crate::from_build_folder().then(crate::repository_root);
    locate(
        env::var_os(KIT_FOLDER_VARIABLE).map(PathBuf::from),
        env::var(PYTHON_VARIABLE).ok(),
        built,
        crate::installed().map(|installed| installed.runtime.as_path()),
    )
}

fn kit_folder() -> PathBuf {
    runtime().kit
}

fn python() -> String {
    runtime().python
}

/// Runs a kit command that prints an envelope, and returns it. The command's own exit code does not decide: a tool may
/// report a finding with exit 1 and still print its report, so only a missing or unreadable answer is a failure.
pub fn run(tool: &str, arguments: &[String]) -> Result<Value, Failure> {
    run_hearing(tool, arguments, None)
}

/// The kit run as a process for these arguments, as every request runs it: the pinned kit's Python, from the kit's folder, with no
/// bytecode written, UTF-8 throughout and no console. Standard output and error are piped and standard input is closed; a kit
/// command that stays running (`serve`) pipes its input instead. Progress lines are asked for only when someone will hear them.
pub(crate) fn kit_command(arguments: &[String], progress: bool) -> Result<Command, Failure> {
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
    if progress {
        command.env(PROGRESS_VARIABLE, "1");
    } else {
        command.env_remove(PROGRESS_VARIABLE);
    }
    hide_console(&mut command);
    Ok(command)
}

/// Why a kit process could not start: no Python, or anything else.
pub(crate) fn not_started(problem: std::io::Error) -> Failure {
    let code = if problem.kind() == ErrorKind::NotFound { FailureCode::PythonMissing } else { FailureCode::ToolFailed };
    Failure::new(code, problem.to_string())
}

/// Runs a kit command as `run` does, and passes each progress line it writes to the listener while it works. Standard output is
/// read on its own thread, so a tool that fills one pipe never waits on the other.
pub fn run_hearing(tool: &str, arguments: &[String], listener: Option<Listener>) -> Result<Value, Failure> {
    let mut child = kit_command(arguments, listener.is_some())?.spawn().map_err(not_started)?;
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
/// change the program makes for the owner. An empty `report` names a command's one unnamed report, as `cleanup` has (0.27.0).
pub fn allowed_by_manifest(manifest: &Value, command: &str, report: &str) -> Result<(), String> {
    let commands = manifest["data"]["commands"].as_array().map_or(&[][..], Vec::as_slice);
    let named = |r: &Value| if report.is_empty() { r["name"].is_null() } else { r["name"].as_str() == Some(report) };
    let found = commands
        .iter()
        .find(|c| c["name"].as_str() == Some(command))
        .and_then(|c| c["reports"].as_array())
        .and_then(|reports| reports.iter().find(|r| named(r)))
        .ok_or_else(|| format!("the tool kit has no {command} {report}"))?;
    let effect = found["effect"].as_str().unwrap_or_default();
    if ALLOWED_EFFECTS.contains(&effect) {
        Ok(())
    } else {
        Err(format!("the tool kit says {command} {report} is {effect:?}, which this program does not run"))
    }
}

/// Where a game's tools offer a report a page needs, found by what it does (its surface), never by a tool's name (0.26.0).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Offered {
    /// The command to run.
    Tool(String),
    /// This game's tools have no such report: the page says so in words.
    Missing,
    /// The report is there but the manifest now gives it another effect than the page runs: refused, with the reason.
    Changed(String),
}

/// The kit command of this game whose `report` carries `surface`, checked to still have the effect the page expects; a report
/// that writes or runs is also checked by `allowed_by_manifest`. Pages that find a tool by surface go through this one place.
/// An empty `report` is a command with no reports of its own (0.35.0), as in `allowed_by_manifest`.
pub fn offered(manifest: &Value, game: &str, surface: &str, report: &str, effect: &str) -> Offered {
    let commands = manifest["data"]["commands"].as_array().map_or(&[][..], Vec::as_slice);
    let named = |r: &Value| if report.is_empty() { r["name"].is_null() } else { r["name"].as_str() == Some(report) };
    for command in commands.iter().filter(|c| c["game"].as_str() == Some(game)) {
        let reports = command["reports"].as_array().map_or(&[][..], Vec::as_slice);
        let Some(found) = reports.iter().find(|r| named(r) && r["surface"].as_str() == Some(surface)) else {
            continue;
        };
        let name = command["name"].as_str().unwrap_or_default().to_owned();
        let has = found["effect"].as_str().unwrap_or_default();
        if has != effect {
            return Offered::Changed(format!(
                "the tool kit now says {name} {report} is {has:?}, not what this page runs"
            ));
        }
        if effect != "reads"
            && let Err(reason) = allowed_by_manifest(manifest, &name, report)
        {
            return Offered::Changed(reason);
        }
        return Offered::Tool(name);
    }
    Offered::Missing
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
    Ok(KitStatus { kit_version: kit_version.to_owned(), tools: commands.len(), source: runtime().source.to_owned() })
}

#[cfg(test)]
#[path = "tests/kit.rs"]
mod tests;
