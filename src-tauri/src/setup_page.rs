//! Settings → Setup (0.87.0; the owner's choices by card, 25 Nov 2026: a setup check, "Show command, run on press", in a
//! Settings tab with a line on Home). What the pages use beyond the Companion itself, whether each is on this computer, and a
//! way to fetch a missing one.
//!
//! Reading asks the tool kit (`programs status`, kit 1.118.0), which only looks. **A fetch runs only on the person's press**,
//! after the window showed them the command whole: the host reads the kit's answer again, takes the command from it (never from
//! the window, which names a program's key and nothing more) and holds it to `companion_core::setup::command_of`. One runs at a
//! time, as its own program with no shell, its output kept for the page. When it ends, this program's search path is read
//! again from Windows, so what was just installed is found without starting the Companion again.

use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit;
use companion_core::prefs;
use companion_core::process;
use companion_core::setup::{self, Row};
use companion_core::terminals::{self, Exit, Terminal};
use serde::Serialize;
use serde_json::{Value, json};
use std::path::Path;
use std::sync::{Arc, Mutex};

const TOOL: &str = "programs";
/// The programs the person said they don't need, in this program's own folder.
const KEPT_FILE: &str = "setup.json";
const KEPT_KEY: &str = "setAside";
const MAX_KEY: usize = 60;

struct Run {
    key: String,
    name: String,
    command: String,
    terminal: Arc<Terminal>,
}

/// The fetch that is running, or the last one that ran until the person looks again.
static RUN: Mutex<Option<Run>> = Mutex::new(None);

/// A fetch command running or ended, as the page shows it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Fetching {
    pub key: String,
    pub name: String,
    pub command: String,
    /// The end of what it has printed, made readable.
    pub output: String,
    /// How it ended; none while it runs.
    pub ended: Option<Exit>,
}

/// What the Setup tab shows.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Setup {
    /// This system as the kit names it: windows, linux or macos.
    pub system: String,
    pub rows: Vec<Row>,
    /// How many games are on the list; none when there is no list yet (First steps makes it).
    pub games: Option<usize>,
    pub fetching: Option<Fetching>,
}

fn programs() -> Result<Value, Failure> {
    let answer = kit::run(TOOL, &["status".to_owned(), "--json".to_owned()])?;
    Ok(answer["data"].clone())
}

/// The keys the person set aside.
pub fn kept(data: &Path) -> Vec<String> {
    match prefs::read_json(&data.join(KEPT_FILE)) {
        Ok(Some(value)) => {
            value[KEPT_KEY].as_array().map(|keys| keys.iter().filter_map(Value::as_str).map(str::to_owned).collect())
        }
        _ => None,
    }
    .unwrap_or_default()
}

/// Keeps the keys set aside, written whole, in order and each once.
pub fn keep(data: &Path, keys: &[String]) -> Result<(), Failure> {
    let mut keys = keys.to_vec();
    keys.sort();
    keys.dedup();
    prefs::write_json(&data.join(KEPT_FILE), &json!({"version": 1, KEPT_KEY: keys}))
}

fn shown(run: &Run) -> Fetching {
    let output = run.terminal.output();
    Fetching {
        key: run.key.clone(),
        name: run.name.clone(),
        command: run.command.clone(),
        output: setup::tidy(&output.text),
        ended: output.exit,
    }
}

/// The fetch that is running or has just ended, if any: cheap, so the page may ask each second while one runs.
pub fn fetching() -> Option<Fetching> {
    RUN.lock().ok()?.as_ref().map(shown)
}

fn setup_of(data: &Path, programs: &Value) -> Setup {
    let listed = games::load().ok().flatten();
    let ids: Vec<String> = listed.iter().flatten().map(|game| game.id.clone()).collect();
    Setup {
        system: programs["system"].as_str().unwrap_or_default().to_owned(),
        rows: setup::rows(programs, &ids, &kept(data)),
        games: listed.map(|games| games.len()),
        fetching: fetching(),
    }
}

/// How the setup stands. Only reads.
pub fn read(data: &Path) -> Result<Setup, Failure> {
    Ok(setup_of(data, &programs()?))
}

/// Looks again, on the person's press: reads Windows' search path afresh, forgets a fetch that has ended, and reads.
pub fn look_again(data: &Path) -> Result<Setup, Failure> {
    refresh_path();
    if let Ok(mut run) = RUN.lock()
        && run.as_ref().is_some_and(|run| run.terminal.output().exit.is_some())
    {
        *run = None;
    }
    read(data)
}

/// Runs the command that fetches a missing program, on the person's press: the kit's own command for it, checked again here.
pub fn fetch(data: &Path, key: &str) -> Result<Fetching, Failure> {
    let mut run = RUN.lock().map_err(|_| Failure::refused("the last fetch left its record unreadable"))?;
    if run.as_ref().is_some_and(|run| run.terminal.output().exit.is_none()) {
        return Err(Failure::refused("another program is being fetched; wait for it to end, or stop it"));
    }
    let programs = programs()?;
    let words = setup::command_of(&programs, key).map_err(Failure::refused)?;
    let name = setup::rows(&programs, &[], &[])
        .into_iter()
        .find(|row| row.key == key)
        .map_or_else(|| key.to_owned(), |row| row.name);
    std::fs::create_dir_all(data).map_err(|problem| Failure::refused(format!("{}: {problem}", data.display())))?;
    let terminal = terminals::start(&words[0], &words[1..], data, &[], terminals::DEFAULT_OUTPUT, |_, _, _| {
        refresh_path();
    })
    .map_err(Failure::refused)?;
    let started = Run { key: key.to_owned(), name, command: words.join(" "), terminal };
    let fetching = shown(&started);
    *run = Some(started);
    Ok(fetching)
}

/// Stops the fetch that is running, with what it started that this program may end. An installer Windows already runs with an
/// administrator's rights is not this program's to end, and finishes by itself.
pub fn stop() {
    if let Ok(run) = RUN.lock()
        && let Some(run) = run.as_ref()
    {
        run.terminal.kill();
    }
}

/// The keys set aside with one more, or one fewer.
pub fn with_key(mut keys: Vec<String>, key: &str, aside: bool) -> Vec<String> {
    keys.retain(|kept| kept != key);
    if aside {
        keys.push(key.to_owned());
    }
    keys
}

/// Keeps the person's word that they do or don't need a program: only for one the page shows.
pub fn set_aside(data: &Path, key: &str, aside: bool) -> Result<Setup, Failure> {
    let programs = programs()?;
    if key.len() > MAX_KEY || !setup_of(data, &programs).rows.iter().any(|row| row.key == key) {
        return Err(Failure::refused(format!("the tools name no program {key:?}")));
    }
    keep(data, &with_key(kept(data), key, aside))?;
    Ok(setup_of(data, &programs))
}

/// Opens the page a program is got from by hand, in the browser: only the address the kit names for it.
pub fn open_page(key: &str) -> Result<(), Failure> {
    let address = setup::address_of(&programs()?, key).map_err(Failure::refused)?;
    process::open_address(&address)
        .map_err(|problem| Failure::refused(format!("The browser could not be asked to open the page: {problem}")))
}

/// Reads Windows' search path afresh into this program, so a program installed since it started is found: the computer's and the
/// person's, from the registry, then what this program's own path has beyond them. Nothing changes when the registry gives nothing.
#[cfg(windows)]
fn refresh_path() {
    let read = |key: &str| {
        let mut command = std::process::Command::new("reg");
        command.args(["query", key, "/v", "Path"]);
        process::hide_console(&mut command);
        let output = command.output().ok()?;
        let value = setup::reg_value(&String::from_utf8_lossy(&output.stdout))?;
        Some(setup::expand(&value, |name| std::env::var(name).ok()))
    };
    let computer = read(r"HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment");
    let person = read(r"HKCU\Environment");
    if computer.is_none() && person.is_none() {
        return;
    }
    let current = std::env::var("PATH").unwrap_or_default();
    let fresh = setup::fresh_path(computer.as_deref(), person.as_deref(), &current);
    if fresh != current {
        // SAFETY: on Windows the environment may be changed while other threads run (`std::env::set_var`'s own documentation).
        unsafe { std::env::set_var("PATH", fresh) };
    }
}

#[cfg(not(windows))]
fn refresh_path() {}

#[cfg(test)]
#[path = "tests/setup_page.rs"]
mod tests;
