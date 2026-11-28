//! The Memory page (owner, 19 Nov 2026: memory profiling "will be done from the Companion"): a game's memory over a short watch,
//! followed as it runs, with the owner's own marks beside the figures. The kit's memory watch is found through the manifest's
//! `memory-watch` surface (phobos-modkit 1.47.0); the host names no game, and a game whose tools have no watch is told so.
//!
//! What may run, checked again at every request: reading a watch (`watch-status`, `watch-report`) only reads. Starting one
//! (`watch`, `runs`) attaches Microsoft's dotnet-counters to the running game once unless the owner chose Windows' figures only, so
//! it runs only on the owner's press and confirmation, never by itself. Stopping (`watch-stop`) and marking (`watch-mark`) write
//! only into the watch's own folder in the kit's cache. Each runs only while the manifest still gives it the surface and that
//! effect; every value the window sends is checked here before the kit sees it, and the kit checks again.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::kit::{self, Outcome};
use serde::Serialize;
use serde_json::Value;

const SURFACE: &str = "memory-watch";
const WATCH: &str = "watch";
const STATUS: &str = "watch-status";
const REPORT: &str = "watch-report";
const STOP: &str = "watch-stop";
const MARK: &str = "watch-mark";
const READS: &str = "reads";
const WRITES: &str = "writes";
const RUNS: &str = "runs";
/// The lengths the page offers, in minutes (agent's choice from the owner's word: 60 was "a bit generous", 15 to 20 workable).
pub const MINUTES: [u32; 6] = [5, 10, 15, 20, 30, 60];
const MAX_MARK: usize = 200;
/// Rows per table in a kept watch's report, as the kit's own default.
const TOP: &str = "15";

/// A watch as the kit read it, or word that this game's tools have none.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct MemoryReading {
    /// False when this game's tools have no memory watch.
    pub available: bool,
    pub report: Value,
    pub data: Value,
    pub command_line: String,
}

/// What a stop or a mark did, or why the kit refused it.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct StepResult {
    pub ok: bool,
    pub refusal: Option<String>,
    pub data: Value,
}

/// The kit command that holds this game's memory watch: the one whose `watch-status` carries the surface.
pub fn tool_of(manifest: &Value, game: &str) -> Option<String> {
    commands(manifest)
        .iter()
        .filter(|c| c["game"].as_str() == Some(game))
        .find(|c| {
            reports(c).iter().any(|r| r["name"].as_str() == Some(STATUS) && r["surface"].as_str() == Some(SURFACE))
        })
        .and_then(|c| c["name"].as_str().map(str::to_owned))
}

fn commands(manifest: &Value) -> &[Value] {
    manifest["data"]["commands"].as_array().map_or(&[], Vec::as_slice)
}

fn reports(command: &Value) -> &[Value] {
    command["reports"].as_array().map_or(&[], Vec::as_slice)
}

/// The watch's command, after checking the manifest still gives `report` the surface and the effect this page expects of it.
pub fn checked(manifest: &Value, game: &str, report: &str, effect: &str) -> Result<String, Failure> {
    let refused = || Failure::refused(format!("the tool kit offers no {report} for this game's memory"));
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

/// A kept watch's name as the kit makes it: its start (`20261119-205419`) and, after a dash, its label in plain letters.
pub fn watch_id(text: &str) -> bool {
    checks::stamped_name(text)
}

fn checked_id(watch: Option<&str>) -> Result<Option<&str>, Failure> {
    match watch {
        Some(id) if !watch_id(id) => Err(Failure::refused("that is not a memory watch's name")),
        other => Ok(other),
    }
}

/// The arguments that read a watch as it stands (the running one, else the newest, when none is named).
pub fn status_arguments(tool: &str, watch: Option<&str>) -> Vec<String> {
    let arguments = Args::new(tool, STATUS);
    match watch {
        Some(id) => arguments.extend([id.to_owned()]).json(),
        None => arguments.json(),
    }
}

/// The arguments that start a watch: one of the offered lengths, .NET's figures or not, and the owner's label.
pub fn start_arguments(tool: &str, minutes: u32, counters: bool, label: &str) -> Result<Vec<String>, String> {
    if !MINUTES.contains(&minutes) {
        return Err(format!("{minutes} minutes is not one of the lengths offered"));
    }
    let label = checks::label(label)?;
    let mut arguments = Args::new(tool, WATCH).pair("--minutes", &minutes.to_string());
    if !counters {
        arguments = arguments.flag("--no-counters");
    }
    if !label.is_empty() {
        arguments = arguments.given("--label", &label);
    }
    Ok(arguments.json())
}

/// The arguments that put the owner's words beside a watch's figures, at the moment they pressed the key (seconds since 1970).
/// The words come last, after `--`, so no words can be read as an option.
pub fn mark_arguments(tool: &str, watch: Option<&str>, text: &str, at: Option<f64>) -> Result<Vec<String>, String> {
    let text = checks::one_line(text);
    if text.is_empty() {
        return Err("a mark needs a few words".to_owned());
    }
    if text.chars().count() > MAX_MARK {
        return Err(format!("keep a mark under {MAX_MARK} characters"));
    }
    let mut arguments = Args::new(tool, MARK);
    if let Some(id) = watch {
        arguments = arguments.given("--watch", id);
    }
    if let Some(at) = at {
        if !at.is_finite() || at <= 0.0 {
            return Err("that is not a moment".to_owned());
        }
        arguments = arguments.pair("--at", &format!("{at:.3}"));
    }
    Ok(arguments.flag("--json").flag("--").extend([text]).done())
}

fn command_line(arguments: &[String]) -> String {
    let shown: Vec<&str> = arguments.iter().map(String::as_str).filter(|a| *a != "--json").collect();
    format!("python -m phobos_modkit {}", shown.join(" "))
}

fn unavailable() -> MemoryReading {
    MemoryReading { available: false, report: Value::Null, data: Value::Null, command_line: String::new() }
}

fn reading(arguments: Vec<String>, listener: Option<kit::Listener>) -> Result<MemoryReading, Failure> {
    let answer = kit::run_hearing(&arguments[0], &arguments, listener)?;
    Ok(MemoryReading {
        available: true,
        report: answer["report"].clone(),
        data: answer["data"].clone(),
        command_line: command_line(&arguments),
    })
}

/// The running watch (else the newest, or the one named) as it stands; light enough to read every few seconds.
pub fn status(game: &str, watch: Option<&str>, listener: Option<kit::Listener>) -> Result<MemoryReading, Failure> {
    let manifest = kit::read_manifest()?;
    if tool_of(&manifest, game).is_none() {
        return Ok(unavailable());
    }
    let tool = checked(&manifest, game, STATUS, READS)?;
    reading(status_arguments(&tool, checked_id(watch)?), listener)
}

/// A kept watch's whole report.
pub fn report(game: &str, watch: &str, listener: Option<kit::Listener>) -> Result<MemoryReading, Failure> {
    let manifest = kit::read_manifest()?;
    let tool = checked(&manifest, game, REPORT, READS)?;
    let id = checked_id(Some(watch))?.unwrap_or_default().to_owned();
    reading(Args::new(&tool, REPORT).extend([id]).pair("--top", TOP).json(), listener)
}

/// Starts a watch on the owner's press and confirmation, and answers when it ends with its report. It can run for an hour; the
/// window follows it meanwhile through `status`, and hears its progress through the listener.
pub fn start(
    game: &str,
    minutes: u32,
    counters: bool,
    label: &str,
    listener: Option<kit::Listener>,
) -> Result<MemoryReading, Failure> {
    let manifest = kit::read_manifest()?;
    let tool = checked(&manifest, game, WATCH, RUNS)?;
    reading(start_arguments(&tool, minutes, counters, label).map_err(Failure::refused)?, listener)
}

fn step(arguments: Vec<String>) -> Result<StepResult, Failure> {
    let answer = kit::run(&arguments[0], &arguments)?;
    let outcome = Outcome::of(&answer);
    Ok(StepResult { ok: outcome.ok, refusal: outcome.refusal, data: answer["data"].clone() })
}

/// Asks the running watch (or the one named) to end early.
pub fn stop(game: &str, watch: Option<&str>) -> Result<StepResult, Failure> {
    let manifest = kit::read_manifest()?;
    let tool = checked(&manifest, game, STOP, WRITES)?;
    let arguments = Args::new(&tool, STOP);
    step(match checked_id(watch)? {
        Some(id) => arguments.extend([id.to_owned()]).json(),
        None => arguments.json(),
    })
}

/// Puts the owner's words beside the running watch's figures (or the named watch's), at the moment they began the mark.
pub fn mark(game: &str, watch: Option<&str>, text: &str, at: Option<f64>) -> Result<StepResult, Failure> {
    let manifest = kit::read_manifest()?;
    let tool = checked(&manifest, game, MARK, WRITES)?;
    step(mark_arguments(&tool, checked_id(watch)?, text, at).map_err(Failure::refused)?)
}

#[cfg(test)]
#[path = "tests/memory_page.rs"]
mod tests;
