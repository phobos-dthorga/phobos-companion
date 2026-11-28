//! The Performance page (0.118.0; the owner's ask of 28 Nov 2026 for "relevant, compiled, condensed information and how it relates
//! to everything else", `docs/performance.md`): where the running game spends its time, opened on a few ranked findings and the
//! game's own figures, every row linked to the page that answers what to do about it. The kit's recordings are found through the
//! manifest's `performance` surface (phobos-modkit 1.152.0); the host names no game, and a game whose tools have none is told so.
//!
//! What may run, checked again at every request: reading recordings (`list`, `report`, `callers`, `mod`, `compare`, `trend`) only
//! reads, though `list` keeps a summary of each recording in the kit's own cache. Recording (`record`, `runs`) attaches Microsoft's
//! dotnet-trace and dotnet-counters to the running game for a few seconds, so it runs only on the owner's press: their yes on the
//! page, or the key they press in the game (the owner's choice by card, 28 Nov 2026). One recording runs at a time. Each runs only
//! while the manifest still gives it the surface and that effect; every value the window sends is checked here first.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::kit;
use serde::Serialize;
use serde_json::Value;
use std::sync::atomic::{AtomicBool, Ordering};

const SURFACE: &str = "performance";
const LIST: &str = "list";
const REPORT: &str = "report";
const RECORD: &str = "record";
const CALLERS: &str = "callers";
const MOD: &str = "mod";
const COMPARE: &str = "compare";
const TREND: &str = "trend";
const COSTS: &str = "costs";
const READS: &str = "reads";
const RUNS: &str = "runs";
/// The lengths the page offers, in seconds (agent's choice, owner to revise: 30 first, as the kit's own default).
pub const SECONDS: [u32; 3] = [15, 30, 60];
/// How long a recording from the game's key runs (agent's choice, owner to revise).
pub const KEY_SECONDS: u32 = 30;
/// Rows per table, as the kit's own default.
const TOP: &str = "15";
const MAX_MOD_NAME: usize = 120;

/// Whether a recording is running from this program, so a second press waits for the first.
static RECORDING: AtomicBool = AtomicBool::new(false);

/// What the kit read, or word that this game's tools have no recordings.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct PerformanceReading {
    /// False when this game's tools have no performance recordings.
    pub available: bool,
    pub report: Value,
    pub data: Value,
    pub command_line: String,
}

/// A closer look at one recording, or across them, as the page offers it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Look {
    /// Which code and mods lead to a method (`callers`).
    Callers { method: String },
    /// One mod's cost (`mod`).
    Mod { name: String },
    /// Two recordings side by side (`compare`): the one shown is the later.
    Compare { other: String },
    /// Our own mods across every recording (`trend`).
    Trend,
}

fn commands(manifest: &Value) -> &[Value] {
    manifest["data"]["commands"].as_array().map_or(&[], Vec::as_slice)
}

fn reports(command: &Value) -> &[Value] {
    command["reports"].as_array().map_or(&[], Vec::as_slice)
}

/// The kit command that holds this game's recordings: the one whose `report` carries the surface.
pub fn tool_of(manifest: &Value, game: &str) -> Option<String> {
    commands(manifest)
        .iter()
        .filter(|c| c["game"].as_str() == Some(game))
        .find(|c| {
            reports(c).iter().any(|r| r["name"].as_str() == Some(REPORT) && r["surface"].as_str() == Some(SURFACE))
        })
        .and_then(|c| c["name"].as_str().map(str::to_owned))
}

/// The recordings' command, after checking the manifest still gives `report` the surface and the effect this page expects.
pub fn checked(manifest: &Value, game: &str, report: &str, effect: &str) -> Result<String, Failure> {
    let refused = || Failure::refused(format!("the tool kit offers no {report} for this game's performance"));
    let tool = tool_of(manifest, game).ok_or_else(refused)?;
    let command = commands(manifest).iter().find(|c| c["name"].as_str() == Some(tool.as_str())).ok_or_else(refused)?;
    let found = reports(command).iter().find(|r| r["name"].as_str() == Some(report)).ok_or_else(refused)?;
    if found["surface"].as_str() != Some(SURFACE) || found["effect"].as_str() != Some(effect) {
        return Err(Failure::refused(format!(
            "the tool kit now says {tool} {report} is {:?}, not what this page runs",
            found["effect"].as_str().unwrap_or_default()
        )));
    }
    if effect != READS {
        kit::allowed_by_manifest(manifest, &tool, report).map_err(Failure::refused)?;
    }
    Ok(tool)
}

fn checked_recording(recording: &str) -> Result<String, Failure> {
    if checks::stamped_name(recording) {
        Ok(recording.to_owned())
    } else {
        Err(Failure::refused("that is not a recording's name"))
    }
}

/// A mod's name as a recording gives it: one line, of a sane length, never opening with a dash.
pub fn mod_name(text: &str) -> bool {
    !text.is_empty()
        && text.chars().count() <= MAX_MOD_NAME
        && !text.starts_with('-')
        && text == text.trim()
        && !text.chars().any(char::is_control)
}

/// The arguments that record the running game: one of the offered lengths, allocations or not, and the owner's label.
pub fn record_arguments(tool: &str, seconds: u32, allocations: bool, label: &str) -> Result<Vec<String>, String> {
    if !SECONDS.contains(&seconds) {
        return Err(format!("{seconds} seconds is not one of the lengths offered"));
    }
    let label = checks::label(label)?;
    let mut arguments = Args::new(tool, RECORD).pair("--seconds", &seconds.to_string()).pair("--top", TOP);
    if allocations {
        arguments = arguments.flag("--alloc");
    }
    if !label.is_empty() {
        arguments = arguments.given("--label", &label);
    }
    Ok(arguments.json())
}

/// The arguments for a closer look at a recording. Names come last, after `--`, so none can be read as an option.
pub fn look_arguments(tool: &str, recording: &str, look: &Look) -> Result<Vec<String>, String> {
    let base = |report: &str| Args::new(tool, report).pair("--top", TOP).flag("--json").flag("--");
    Ok(match look {
        Look::Callers { method } => {
            if !checks::method_pattern(method) {
                return Err("that is not a method's name".to_owned());
            }
            base(CALLERS).extend([method.clone(), recording.to_owned()]).done()
        }
        Look::Mod { name } => {
            if !mod_name(name) {
                return Err("that is not a mod's name".to_owned());
            }
            base(MOD).extend([name.clone(), recording.to_owned()]).done()
        }
        Look::Compare { other } => {
            if !checks::stamped_name(other) || other == recording {
                return Err("choose another recording to compare with".to_owned());
            }
            // The earlier first, as the kit reads them: recordings' names begin with when they were made.
            let (first, second) =
                if other.as_str() < recording { (other.as_str(), recording) } else { (recording, other.as_str()) };
            base(COMPARE).extend([first.to_owned(), second.to_owned()]).done()
        }
        Look::Trend => Args::new(tool, TREND).pair("--top", TOP).json(),
    })
}

fn report_of(look: &Look) -> &'static str {
    match look {
        Look::Callers { .. } => CALLERS,
        Look::Mod { .. } => MOD,
        Look::Compare { .. } => COMPARE,
        Look::Trend => TREND,
    }
}

fn command_line(arguments: &[String]) -> String {
    let shown: Vec<&str> = arguments.iter().map(String::as_str).filter(|a| *a != "--json").collect();
    format!("python -m phobos_modkit {}", shown.join(" "))
}

fn unavailable() -> PerformanceReading {
    PerformanceReading { available: false, report: Value::Null, data: Value::Null, command_line: String::new() }
}

fn reading(arguments: Vec<String>, listener: Option<kit::Listener>) -> Result<PerformanceReading, Failure> {
    let answer = kit::run_hearing(&arguments[0], &arguments, listener)?;
    Ok(PerformanceReading {
        available: true,
        report: answer["report"].clone(),
        data: answer["data"].clone(),
        command_line: command_line(&arguments),
    })
}

/// Every recording kept for the game, newest first, each with its summary (the kit makes a missing one the first time).
pub fn list(game: &str, listener: Option<kit::Listener>) -> Result<PerformanceReading, Failure> {
    let manifest = kit::read_manifest()?;
    if tool_of(&manifest, game).is_none() {
        return Ok(unavailable());
    }
    let tool = checked(&manifest, game, LIST, READS)?;
    reading(Args::new(&tool, LIST).json(), listener)
}

/// What each mod costs by the newest recording against the earlier ones, and the busiest methods (0.119.0, phobos-modkit 1.153.0's
/// `costs`), for the tags and badges other pages show; says when the game's tools have none.
pub fn costs(game: &str, listener: Option<kit::Listener>) -> Result<PerformanceReading, Failure> {
    let manifest = kit::read_manifest()?;
    if tool_of(&manifest, game).is_none() {
        return Ok(unavailable());
    }
    let tool = checked(&manifest, game, COSTS, READS)?;
    reading(Args::new(&tool, COSTS).pair("--top", TOP).json(), listener)
}

/// One recording's whole report: its findings, its figures and every table, each row saying what it is about.
pub fn report(game: &str, recording: &str, listener: Option<kit::Listener>) -> Result<PerformanceReading, Failure> {
    let manifest = kit::read_manifest()?;
    let tool = checked(&manifest, game, REPORT, READS)?;
    let recording = checked_recording(recording)?;
    reading(Args::new(&tool, REPORT).pair("--top", TOP).flag("--json").flag("--").extend([recording]).done(), listener)
}

/// A closer look: callers of a method, one mod, a comparison with another recording, or our own mods' trend.
pub fn look(
    game: &str,
    recording: &str,
    look: &Look,
    listener: Option<kit::Listener>,
) -> Result<PerformanceReading, Failure> {
    let manifest = kit::read_manifest()?;
    let tool = checked(&manifest, game, report_of(look), READS)?;
    let recording = checked_recording(recording)?;
    reading(look_arguments(&tool, &recording, look).map_err(Failure::refused)?, listener)
}

/// Clears the running mark when a recording ends, however it ends.
struct Running;

impl Drop for Running {
    fn drop(&mut self) {
        RECORDING.store(false, Ordering::SeqCst);
    }
}

/// Whether a recording from this program is running now.
pub fn recording_now() -> bool {
    RECORDING.load(Ordering::SeqCst)
}

/// Records the running game on the owner's press (their yes on the page, or their key in the game), and answers when it ends with
/// its report. One at a time: a press while one runs is refused in words.
pub fn record(
    game: &str,
    seconds: u32,
    allocations: bool,
    label: &str,
    listener: Option<kit::Listener>,
) -> Result<PerformanceReading, Failure> {
    let manifest = kit::read_manifest()?;
    let tool = checked(&manifest, game, RECORD, RUNS)?;
    let arguments = record_arguments(&tool, seconds, allocations, label).map_err(Failure::refused)?;
    if RECORDING.swap(true, Ordering::SeqCst) {
        return Err(Failure::refused("a recording is already running; it ends in a minute or so"));
    }
    let _running = Running;
    reading(arguments, listener)
}

#[cfg(test)]
#[path = "tests/performance_page.rs"]
mod tests;
