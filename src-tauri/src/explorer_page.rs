//! The Explorer (owner's choice, 20 Nov 2026: "one explorer, two sources"; `docs/debugging.md`, layer 1): a look inside the running
//! game from a snapshot of its memory. Only the running game is built; reading saves comes with the save explorer.
//!
//! The game's tools hold the snapshot: the kit command whose `look-serve` carries the manifest's `look-inside` surface, started as
//! a long-lived child that answers one JSON request a line (`companion_core::serve`). The host names no game, and a game whose
//! tools have no such report is told so in words.
//!
//! What may run, checked again at every start: the command only while the manifest still calls it `runs`, only on the person's
//! press and confirmation in the window, never by itself. It only reads: a snapshot pauses the game for about half a second and
//! changes nothing in it. Every request the window sends is checked here and rebuilt from its checked parts before the child sees
//! it. **One snapshot is held at a time**, and it is let go after ten minutes at most (owner's choice), on Let it go, when the
//! page closes, and when the program closes. Addresses are good only within one snapshot, so every request names the snapshot it
//! belongs to, and one for a snapshot let go is answered "gone".

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::{Failure, FailureCode};
use companion_core::kit::{self, Offered};
use companion_core::serve::{Reply, Served};
use serde::Serialize;
use serde_json::{Map, Value};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant};

const SURFACE: &str = "look-inside";
const SERVE: &str = "look-serve";
const RUNS: &str = "runs";
/// How long a snapshot may be held, in seconds: ten minutes at most (owner's choice, 20 Nov 2026). Windows keeps a snapshot by
/// copying each page the game changes afterwards, so one held longer costs more memory as the game runs on.
pub const LIMIT_SECONDS: u64 = 600;
/// How long the first line may take: the tools may first build their reader, and a snapshot of a large game takes a moment.
const FIRST_LINE_WAIT: Duration = Duration::from_secs(600);
/// How long past the limit the host waits on an answer before it lets the snapshot go itself: the reader ends at its limit.
const PAST_LIMIT: Duration = Duration::from_secs(30);
/// How long a close waits for the reader to end politely before ending it.
const CLOSE_GRACE: Duration = Duration::from_secs(5);
/// How long the program waits for it as it closes.
const EXIT_GRACE: Duration = Duration::from_secs(2);
/// How often the host looks whether a held snapshot's time is up.
const WATCH_EVERY: Duration = Duration::from_secs(1);

pub const MAX_SKIP: u64 = 1_000_000;
pub const MAX_TAKE: u64 = 500;
pub const MAX_HOLDERS: u64 = 500;
pub const MAX_SAMPLE: u64 = 20;
pub const MAX_MATCH: usize = 80;

/// Why a snapshot is no longer held, as the window says it in words.
pub mod released {
    /// Its ten minutes were up.
    pub const LIMIT: &str = "limit";
    /// The person let it go (Let it go, or leaving the page).
    pub const ASKED: &str = "asked";
    /// The reader stopped by itself before its time.
    pub const ENDED: &str = "ended";
    /// The request named a snapshot that is not the one held (let go earlier, or another taken since).
    pub const GONE: &str = "gone";
}

/// Whether this game's tools can look inside the running game, and why not when they cannot.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Offer {
    /// False when this game's tools have no look inside.
    pub available: bool,
    /// The tools have it, but the manifest no longer gives it the effect this page runs.
    pub refusal: Option<String>,
}

/// What came of taking a snapshot.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Taken {
    /// False when this game's tools have no look inside.
    pub available: bool,
    /// The snapshot's number in this run of the program, which every request names; none when none was taken.
    pub snapshot: Option<u64>,
    /// The reader's first line: when, how long the game paused, how many objects, the time limit.
    pub ready: Value,
    /// Why no snapshot was taken, in the tools' words (the game is not running, for one).
    pub refusal: Option<String>,
    pub command_line: String,
}

/// One answer from a held snapshot, or word that it is no longer held.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Answer {
    pub ok: bool,
    pub data: Value,
    /// The reader's own words when it could not answer.
    pub error: Option<String>,
    /// Set when the snapshot is no longer held: `released::LIMIT`, `ASKED`, `ENDED` or `GONE`.
    pub released: Option<String>,
}

impl Answer {
    fn released(reason: &str, error: Option<String>) -> Self {
        Self { ok: false, data: Value::Null, error, released: Some(reason.to_owned()) }
    }
}

/// The command holding this game's look inside, found by its surface, checked to still be one this page runs.
pub fn tool_of(manifest: &Value, game: &str) -> Result<Option<String>, Failure> {
    match kit::offered(manifest, game, SURFACE, SERVE, RUNS) {
        Offered::Tool(name) => Ok(Some(name)),
        Offered::Missing => Ok(None),
        Offered::Changed(reason) => Err(Failure::refused(reason)),
    }
}

/// Whether this game's tools can look inside the running game: read when the page opens, so it can say so before any press.
pub fn offer(game: &str) -> Result<Offer, Failure> {
    let manifest = kit::read_manifest()?;
    Ok(match tool_of(&manifest, game) {
        Ok(Some(_)) => Offer { available: true, refusal: None },
        Ok(None) => Offer { available: false, refusal: None },
        Err(failure) => Offer { available: true, refusal: Some(failure.detail) },
    })
}

/// The arguments that hold a snapshot: the time limit, and the person's label as one argument.
pub fn serve_arguments(tool: &str, label: &str) -> Result<Vec<String>, String> {
    let label = checks::label(label)?;
    let mut arguments = Args::new(tool, SERVE).pair("--limit-seconds", &LIMIT_SECONDS.to_string());
    if !label.is_empty() {
        arguments = arguments.given("--label", &label);
    }
    Ok(arguments.done())
}

fn command_line(arguments: &[String]) -> String {
    format!("python -m phobos_modkit {}", arguments.join(" "))
}

fn whole(request: &Value, name: &str, range: std::ops::RangeInclusive<u64>, fallback: u64) -> Result<u64, String> {
    match &request[name] {
        Value::Null => Ok(fallback),
        value => value
            .as_u64()
            .filter(|n| range.contains(n))
            .ok_or_else(|| format!("{name} must be a whole number from {} to {}", range.start(), range.end())),
    }
}

fn text<'a>(request: &'a Value, name: &str) -> Result<&'a str, String> {
    match &request[name] {
        Value::Null => Ok(""),
        Value::String(text) => Ok(text),
        _ => Err(format!("{name} must be text")),
    }
}

fn kind_name(request: &Value) -> Result<String, String> {
    let name = text(request, "type")?;
    if checks::type_name(name) { Ok(name.to_owned()) } else { Err("that is not a kind's name".to_owned()) }
}

fn address(request: &Value) -> Result<String, String> {
    let address = text(request, "address")?;
    if checks::memory_address(address) {
        Ok(address.to_owned())
    } else {
        Err("that is not a memory address".to_owned())
    }
}

/// A request from the window, checked and rebuilt from its checked parts alone, so nothing else reaches the reader: an op the
/// page uses, a kind's name, an address, counts within their bounds, a word filter of one short line.
pub fn checked_request(request: &Value) -> Result<Value, String> {
    if !request.is_object() {
        return Err("a request is a set of named values".to_owned());
    }
    let op = text(request, "op")?;
    let mut checked = Map::new();
    checked.insert("op".to_owned(), Value::from(op));
    match op {
        // "checks" (0.91.0) asks every live check the game's tools keep of the snapshot held; it takes nothing from the window.
        "overview" | "info" | "release" | "checks" => {}
        "kind" => {
            checked.insert("type".to_owned(), kind_name(request)?.into());
            checked.insert("skip".to_owned(), whole(request, "skip", 0..=MAX_SKIP, 0)?.into());
            checked.insert("take".to_owned(), whole(request, "take", 1..=MAX_TAKE, 50)?.into());
            let sort = text(request, "sort")?;
            if !matches!(sort, "" | "size") {
                return Err("a kind is listed as found or largest first".to_owned());
            }
            checked.insert("sort".to_owned(), sort.into());
            let filter = text(request, "match")?;
            if filter.chars().count() > MAX_MATCH || filter.contains(['\n', '\r', '\0']) {
                return Err(format!("keep the filter to one line under {MAX_MATCH} characters"));
            }
            checked.insert("match".to_owned(), filter.trim().into());
        }
        "object" => {
            checked.insert("address".to_owned(), address(request)?.into());
            checked.insert("skip".to_owned(), whole(request, "skip", 0..=MAX_SKIP, 0)?.into());
            checked.insert("take".to_owned(), whole(request, "take", 1..=MAX_TAKE, 50)?.into());
        }
        "holders" => {
            checked.insert("address".to_owned(), address(request)?.into());
            checked.insert("max".to_owned(), whole(request, "max", 1..=MAX_HOLDERS, 50)?.into());
        }
        "path" => {
            checked.insert("address".to_owned(), address(request)?.into());
        }
        "why" => {
            checked.insert("type".to_owned(), kind_name(request)?.into());
            checked.insert("sample".to_owned(), whole(request, "sample", 1..=MAX_SAMPLE, 3)?.into());
        }
        _ => return Err("that is not a question this page asks".to_owned()),
    }
    Ok(Value::Object(checked))
}

/// When a snapshot whose first line says it was this old, with this limit, must be let go: never later than the program's own
/// limit, whatever the reader says.
pub fn deadline(ready: &Value, now: Instant) -> Instant {
    let limit = ready["limitSeconds"].as_u64().map_or(LIMIT_SECONDS, |limit| limit.min(LIMIT_SECONDS));
    let age = ready["ageSeconds"].as_f64().filter(|age| age.is_finite() && *age > 0.0).unwrap_or(0.0);
    now + Duration::from_secs(limit).saturating_sub(Duration::from_secs_f64(age.min(limit as f64)))
}

/// What a reply from the reader means for the window, and whether the snapshot is no longer held. A reader that let go as its
/// time ran out says so in its own words; the clock tells that from a reader that stopped early.
pub fn answer_of(reply: Reply, time_up: bool) -> Answer {
    let ended = if time_up { released::LIMIT } else { released::ENDED };
    match reply {
        Reply::Answer(value) => {
            let error = value["error"].as_str().map(str::to_owned);
            if value["released"] == Value::Bool(true) {
                let reason = if value["ok"] == Value::Bool(true) { released::ASKED } else { ended };
                return Answer::released(reason, error);
            }
            Answer { ok: value["ok"] == Value::Bool(true), data: value["data"].clone(), error, released: None }
        }
        Reply::Released(reason) => Answer::released(released::LIMIT, Some(reason).filter(|r| !r.is_empty())),
        Reply::Ended(said) => Answer::released(ended, Some(said).filter(|s| !s.is_empty())),
        Reply::TimedOut => Answer::released(released::LIMIT, None),
    }
}

/// The snapshot held now: its number, the reader holding it, and when it must be let go.
struct Held {
    snapshot: u64,
    served: Served,
    deadline: Instant,
}

static HELD: Mutex<Option<Arc<Held>>> = Mutex::new(None);
static TAKEN: AtomicU64 = AtomicU64::new(0);

fn held() -> MutexGuard<'static, Option<Arc<Held>>> {
    HELD.lock().unwrap_or_else(std::sync::PoisonError::into_inner)
}

/// The snapshot held now, if it is the one named.
fn current(snapshot: u64) -> Option<Arc<Held>> {
    held().as_ref().filter(|held| held.snapshot == snapshot).cloned()
}

/// Takes the snapshot named (or whichever is held, when none is named) out of the program's hands; whoever gets it closes it.
fn take(snapshot: Option<u64>) -> Option<Arc<Held>> {
    let mut held = held();
    if snapshot.is_none_or(|snapshot| held.as_ref().is_some_and(|h| h.snapshot == snapshot)) {
        held.take()
    } else {
        None
    }
}

/// Closes a reader on a thread of its own, so the window hears at once; a reader busy with a long walk is ended, with whatever
/// it started, once the grace has passed.
fn close_later(held: Arc<Held>) {
    thread::spawn(move || held.served.close(CLOSE_GRACE));
}

/// Lets the held snapshot go when its time is up, even with the page gone and no request coming.
fn watch(snapshot: u64, deadline: Instant) {
    thread::spawn(move || {
        loop {
            thread::sleep(WATCH_EVERY.min(deadline.saturating_duration_since(Instant::now())));
            if current(snapshot).is_none() {
                return;
            }
            if Instant::now() >= deadline {
                if let Some(held) = take(Some(snapshot)) {
                    close_later(held);
                }
                return;
            }
        }
    });
}

/// Takes a snapshot of the running game and holds it, on the person's press and confirmation: lets any snapshot already held go
/// first. The first line says whether it was taken; the progress of taking it goes to the listener.
pub fn start(game: &str, label: &str, listener: Option<kit::Listener>) -> Result<Taken, Failure> {
    let manifest = kit::read_manifest()?;
    let Some(tool) = tool_of(&manifest, game)? else {
        return Ok(Taken {
            available: false,
            snapshot: None,
            ready: Value::Null,
            refusal: None,
            command_line: String::new(),
        });
    };
    let arguments = serve_arguments(&tool, label).map_err(Failure::refused)?;
    if let Some(old) = take(None) {
        old.served.close(CLOSE_GRACE);
    }
    let served = Served::start(&arguments)?;
    let reply = served.first(listener, FIRST_LINE_WAIT);
    let command_line = command_line(&arguments);
    let refused = |refusal: String, ready: Value| Taken {
        available: true,
        snapshot: None,
        ready,
        refusal: Some(refusal),
        command_line: command_line.clone(),
    };
    match reply {
        Reply::Answer(ready) if ready["ready"] == Value::Bool(true) => {
            let snapshot = TAKEN.fetch_add(1, Ordering::SeqCst) + 1;
            let deadline = deadline(&ready, Instant::now());
            *held() = Some(Arc::new(Held { snapshot, served, deadline }));
            watch(snapshot, deadline);
            Ok(Taken { available: true, snapshot: Some(snapshot), ready, refusal: None, command_line })
        }
        Reply::Answer(ready) => {
            served.close(CLOSE_GRACE);
            let reason = ready["error"].as_str().unwrap_or_default().to_owned();
            Ok(refused(reason, ready))
        }
        Reply::Released(reason) => Ok(refused(reason, Value::Null)),
        Reply::Ended(said) => Err(Failure::new(
            FailureCode::ToolFailed,
            if said.is_empty() {
                "the tools stopped before they said whether a snapshot was taken".to_owned()
            } else {
                said
            },
        )),
        Reply::TimedOut => {
            served.close(Duration::ZERO);
            Err(Failure::new(FailureCode::ToolFailed, "the tools said nothing for ten minutes, so they were stopped"))
        }
    }
}

/// Asks the held snapshot one question the host has checked; answers "gone" when the snapshot named is no longer held. One
/// question is answered at a time.
pub fn ask(snapshot: u64, request: &Value, listener: Option<kit::Listener>) -> Result<Answer, Failure> {
    let checked = checked_request(request).map_err(Failure::refused)?;
    if checked["op"] == "release" {
        return Ok(if release(Some(snapshot)) {
            Answer::released(released::ASKED, None)
        } else {
            Answer::released(released::GONE, None)
        });
    }
    let Some(held) = current(snapshot) else {
        return Ok(Answer::released(released::GONE, None));
    };
    let reply = held.served.ask(&checked, listener, Some(held.deadline + PAST_LIMIT));
    let answer = answer_of(reply, Instant::now() + PAST_LIMIT >= held.deadline);
    if answer.released.is_some()
        && let Some(gone) = take(Some(snapshot))
    {
        close_later(gone);
    }
    Ok(answer)
}

/// Lets the snapshot named go (whichever is held, when none is named): on Let it go, and when the page closes. True when one was
/// held. The reader is closed on a thread of its own, so the window hears at once.
pub fn release(snapshot: Option<u64>) -> bool {
    take(snapshot).map(close_later).is_some()
}

/// Lets any held snapshot go as the program closes, waiting a moment for the reader to end.
pub fn release_at_exit() {
    if let Some(held) = take(None) {
        held.served.close(EXIT_GRACE);
    }
}

#[cfg(test)]
#[path = "tests/explorer_page.rs"]
mod tests;
