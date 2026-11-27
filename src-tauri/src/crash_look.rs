//! After a crash (0.105.0; the owner's choice of 27 Nov 2026, "Home notices by itself"): Home says which programs crashed since the
//! person last looked, and, after Windows recorded an unexpected shutdown, looks once by itself for files the crash or power cut
//! left filled with zeros.
//!
//! Both are the kit's game-free readings (phobos-modkit 1.138.0): `crash-dump --list`, which opens no dump, and `zeroed status`,
//! which asks Windows' log and the kit's record of the last look, each about a tenth of a second. The slow `zeroed check` (about
//! two minutes) runs only when a fresh `status` says one is due, reaching back the days that status names, so it runs once after
//! each crash and never otherwise. **Each runs only while the manifest calls it `reads`** (`kit::reads_only`), since nobody
//! pressed anything. Nothing is changed: putting a file back is the kit's `zeroed restore --apply`, which this program does not run.

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::kit;
use serde::{Deserialize, Serialize};
use serde_json::Value;

const ZEROED: &str = "zeroed";
const STATUS: &str = "status";
const CHECK: &str = "check";
const CRASH_DUMP: &str = "crash-dump";
/// The newest dumps read; older ones were seen long ago.
const DUMPS_READ: &str = "20";
/// The furthest a look reaches back, whatever a status says (the kit's own limit too).
const MAX_DAYS: u64 = 30;
/// The fewest days a look reaches back (the kit's default).
const MIN_DAYS: u64 = 3;

/// One crash dump Windows kept, as the kit names it: never opened here.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Dump {
    pub file: String,
    pub program: String,
    pub time: String,
    pub size: u64,
}

/// What Home needs to know at once: the crash dumps kept, and whether a look for zero-filled files is due.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub last_shutdown: Option<String>,
    pub last_check: Option<String>,
    pub due: bool,
    pub days: u64,
    pub dumps: Vec<Dump>,
}

/// One file a crash left filled with zeros, with what the kit says puts it right.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Zeroed {
    pub path: String,
    pub kind: String,
    #[serde(default)]
    pub repository: String,
    pub size: u64,
    pub advice: String,
    #[serde(default)]
    pub restorable: bool,
}

/// What a look found, and the shutdown it looked after.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Look {
    pub last_shutdown: Option<String>,
    pub days: u64,
    pub files: Vec<Zeroed>,
}

/// The status from `zeroed status`'s data and `crash-dump --list`'s; a dump of the wrong shape is passed over.
pub fn status_of(zeroed: &Value, dumps: &Value) -> Status {
    let text = |v: &Value| v.as_str().filter(|s| !s.is_empty()).map(str::to_owned);
    Status {
        last_shutdown: text(&zeroed["lastShutdown"]),
        last_check: text(&zeroed["lastCheck"]),
        due: zeroed["due"].as_bool() == Some(true),
        days: days_of(&zeroed["days"]),
        dumps: dumps["dumps"]
            .as_array()
            .map_or(&[][..], Vec::as_slice)
            .iter()
            .filter_map(|d| serde_json::from_value(d.clone()).ok())
            .collect(),
    }
}

/// The days a look reaches back, held to the kit's range whatever a status says.
pub fn days_of(value: &Value) -> u64 {
    value.as_u64().unwrap_or(MIN_DAYS).clamp(MIN_DAYS, MAX_DAYS)
}

/// The arguments for each reading: the program's own words only, nothing from the window.
pub fn status_arguments() -> Vec<String> {
    Args::new(ZEROED, STATUS).json()
}

pub fn dumps_arguments() -> Vec<String> {
    Args::command(CRASH_DUMP).flag("--list").pair("--top", DUMPS_READ).json()
}

pub fn look_arguments(days: u64) -> Vec<String> {
    Args::new(ZEROED, CHECK).pair("--days", &days.clamp(MIN_DAYS, MAX_DAYS).to_string()).json()
}

/// The crash dumps kept and whether a look is due: quick, read by Home at most every half hour.
pub fn status() -> Result<Status, Failure> {
    let manifest = kit::read_manifest()?;
    kit::reads_only(&manifest, ZEROED, STATUS).map_err(Failure::refused)?;
    kit::reads_only(&manifest, CRASH_DUMP, "").map_err(Failure::refused)?;
    let zeroed = kit::run(ZEROED, &status_arguments())?;
    let dumps = kit::run(CRASH_DUMP, &dumps_arguments())?;
    Ok(status_of(&zeroed["data"], &dumps["data"]))
}

/// Looks for files a crash left filled with zeros, by itself, only when a fresh status says one is due: refused otherwise.
pub fn look(listener: Option<kit::Listener>) -> Result<Look, Failure> {
    let manifest = kit::read_manifest()?;
    kit::reads_only(&manifest, ZEROED, STATUS).map_err(Failure::refused)?;
    kit::reads_only(&manifest, ZEROED, CHECK).map_err(Failure::refused)?;
    let now = kit::run(ZEROED, &status_arguments())?;
    if now["data"]["due"].as_bool() != Some(true) {
        return Err(Failure::refused("no look is due: nothing shut down unexpectedly since the last one".to_owned()));
    }
    let days = days_of(&now["data"]["days"]);
    let found = kit::run_hearing(ZEROED, &look_arguments(days), listener)?;
    let files = found["data"]["files"]
        .as_array()
        .map_or(&[][..], Vec::as_slice)
        .iter()
        .filter_map(|f| serde_json::from_value(f.clone()).ok())
        .collect();
    Ok(Look { last_shutdown: now["data"]["lastShutdown"].as_str().map(str::to_owned), days, files })
}

#[cfg(test)]
#[path = "tests/crash_look.rs"]
mod tests;
