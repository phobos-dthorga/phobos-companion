//! Other authors' code (0.26.0; the owner chose "Read and compare, on your press", 19 Nov 2026): on the Code map, a patched
//! method's or any outside thing's source, from its public clone or a decompile, a decompile on the owner's press when neither is
//! kept, and what an update changed between two kept builds.
//!
//! The tools are found by the manifest's surfaces (`other-code`, `updates`; phobos-modkit 1.49.0), never by name, so a game whose
//! tools have none is told so. The host checks every request: a name has the shape of a type or member name and goes after `--`,
//! so it can never be read as an option; a file is a plain `.dll` name; and **only an assembly the tools' own `holder` named in
//! this run of the program may be decompiled**, so the window can never point the decompiler at another file.
//!
//! **I've read it** (0.104.0; the owner's choice of 27 Nov 2026, "Finish today's loop") marks a temporary patch whose update the
//! check asked about as read, with the kit's game-free `reviews mark`: only a row and build this run's update check named, and
//! only into the program's own folder, so nothing in the repository changes. A newer build asks again.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit::{self, Offered, Outcome};
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeSet;
use std::sync::Mutex;

const OTHER_CODE: &str = "other-code";
const UPDATES: &str = "updates";
const UPDATE_CHECK: &str = "update-check";
const READS: &str = "reads";
const RUNS: &str = "runs";
/// The kit's game-free marks of what the owner has read (phobos-modkit 1.137.0), named as `picks` is: a game-free command.
const REVIEWS: &str = "reviews";
const MARK: &str = "mark";
/// The kind of mark the update check reads for its temporary patches.
const TEMPORARY_PATCH: &str = "temporary-patch";
/// Longest temporary patch row id the kit accepts.
const MAX_ROW: usize = 120;
/// Longest name or file name accepted from the window.
const MAX_NAME: usize = 300;

/// The assemblies `holder` named, the only ones `decompile` may be asked for.
static HELD: Mutex<BTreeSet<String>> = Mutex::new(BTreeSet::new());

/// Each repository's last update check (0.72.0), as (game, repository, the kit's report): What does this mean for my mods? asks
/// about it, and the host takes the report from here.
static CHECKED: Mutex<Vec<(String, String, Value)>> = Mutex::new(Vec::new());

/// The temporary patches each repository's last update check asked the owner to read, as (game, repository, row, build): the
/// only ones I've read it may mark.
static TOUCHED: Mutex<Vec<(String, String, String, String)>> = Mutex::new(Vec::new());

/// Keeps the rows a check asked about (changed or removed, with the build it read), in place of the repository's last.
pub fn remember_touched(game: &str, repository: &str, data: &Value) {
    let rows = data["temporary"].as_array().map_or(&[][..], Vec::as_slice);
    let touched =
        rows.iter().filter(|row| matches!(row["status"].as_str(), Some("changed" | "removed"))).filter_map(|row| {
            let id = row["row"].as_str().map(str::to_owned).or_else(|| row["row"].as_i64().map(|n| n.to_string()))?;
            Some((id, row["build"].as_str()?.to_owned()))
        });
    if let Ok(mut kept) = TOUCHED.lock() {
        kept.retain(|(g, r, ..)| !(g == game && r == repository));
        kept.extend(touched.map(|(id, build)| (game.to_owned(), repository.to_owned(), id, build)));
    }
}

/// Whether this run's last update check of the repository asked about this row, at this build.
pub fn was_touched(game: &str, repository: &str, row: &str, build: &str) -> bool {
    TOUCHED
        .lock()
        .is_ok_and(|kept| kept.iter().any(|(g, r, id, b)| g == game && r == repository && id == row && b == build))
}

/// The arguments for `reviews mark`: the row and build checked for shape, the row as one argument.
pub fn mark_arguments(root: &std::path::Path, row: &str, build: &str, clear: bool) -> Result<Vec<String>, String> {
    if row.trim().is_empty() || row.len() > MAX_ROW || row.chars().any(char::is_control) {
        return Err("that is not a temporary patch's row".to_owned());
    }
    if !(6..=64).contains(&build.len()) || !build.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("that is not a build the check named".to_owned());
    }
    let arguments = Args::new(REVIEWS, MARK).root(root).pair("--kind", TEMPORARY_PATCH).given("--id", row.trim());
    Ok(if clear { arguments.flag("--clear") } else { arguments.given("--build", build) }.json())
}

/// Marks a temporary patch's update as read, or takes the mark back, on the owner's press: only a row and build this run's
/// update check of the repository asked about, while the manifest calls `reviews mark` `writes`.
pub fn mark_read(game: &str, repository: &str, row: &str, build: &str, clear: bool) -> Result<Answer, Failure> {
    let found = games::named_repository(game, repository)?;
    if !was_touched(game, repository, row, build) {
        return Err(Failure::refused(
            "only a temporary patch this run's update check asked about can be marked as read: check again".to_owned(),
        ));
    }
    kit::allowed_by_manifest(&kit::read_manifest()?, REVIEWS, MARK).map_err(Failure::refused)?;
    let arguments = mark_arguments(&found.path, row, build, clear).map_err(Failure::refused)?;
    Ok(Answer::of(&kit::run(REVIEWS, &arguments)?))
}

/// Keeps a repository's latest update check, in place of the last.
pub fn remember_check(game: &str, repository: &str, report: &Value) {
    if let Ok(mut checked) = CHECKED.lock() {
        checked.retain(|(g, r, _)| !(g == game && r == repository));
        checked.push((game.to_owned(), repository.to_owned(), report.clone()));
    }
}

/// A repository's latest update check's report, from this run of the program.
pub fn remembered_check(game: &str, repository: &str) -> Result<Value, Failure> {
    CHECKED
        .lock()
        .ok()
        .and_then(|checked| {
            checked.iter().find(|(g, r, _)| g == game && r == repository).map(|(.., report)| report.clone())
        })
        .ok_or_else(|| Failure::refused("that repository's update check is not one this run made: check again"))
}

/// What the tools answered: `available` is false when this game's tools offer no such report.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Answer {
    pub available: bool,
    pub ok: bool,
    pub refusal: Option<String>,
    pub report: Value,
    pub data: Value,
}

impl Answer {
    fn missing() -> Self {
        Self { available: false, ok: false, refusal: None, report: Value::Null, data: Value::Null }
    }

    fn of(answer: &Value) -> Self {
        let outcome = Outcome::of(answer);
        let refused = answer["data"]["ok"].as_bool() == Some(false);
        let refusal = outcome.refusal.or_else(|| answer["data"]["reason"].as_str().map(str::to_owned));
        Self {
            available: true,
            ok: outcome.ok && !refused,
            refusal,
            report: answer["report"].clone(),
            data: answer["data"].clone(),
        }
    }
}

/// A type or member name as code, Harmony and our graph write them: letters, digits and `_ . : + `` < > ,`, not opening with a dash.
pub fn type_name(text: &str) -> bool {
    !text.is_empty()
        && text.len() <= MAX_NAME
        && !text.starts_with('-')
        && text.chars().all(|c| c.is_ascii_alphanumeric() || "_.:+`<>, ".contains(c))
        && text.chars().any(|c| c.is_ascii_alphabetic())
}

/// A kept file's name: a `.dll` with no folder in it.
pub fn file_name(text: &str) -> bool {
    text.len() <= MAX_NAME
        && text.to_ascii_lowercase().ends_with(".dll")
        && !text.starts_with('-')
        && text.chars().all(|c| c.is_ascii_alphanumeric() || "._- ".contains(c))
}

/// A mod's package id as the archive keeps owners.
pub fn owner_id(text: &str) -> bool {
    !text.is_empty()
        && text.len() <= MAX_NAME
        && !text.starts_with('-')
        && text.chars().all(|c| c.is_ascii_alphanumeric() || "._-".contains(c))
}

fn tool(game: &str, surface: &str, report: &str, effect: &str) -> Result<Option<String>, Failure> {
    let manifest = kit::read_manifest()?;
    match kit::offered(&manifest, game, surface, report, effect) {
        Offered::Tool(name) => Ok(Some(name)),
        Offered::Missing => Ok(None),
        Offered::Changed(reason) => Err(Failure::refused(reason)),
    }
}

/// The arguments for `show` or `holder`: the name checked, after `--`.
pub fn their_arguments(tool: &str, kind: &str, root: &std::path::Path, name: &str) -> Result<Vec<String>, String> {
    if !matches!(kind, "show" | "holder") {
        return Err(format!("{kind:?} is not a question the tools answer about other code"));
    }
    if !type_name(name) {
        return Err("that is not the name of a type or a member".to_owned());
    }
    let mut arguments = Args::new(tool, kind).root(root).json();
    arguments.extend(["--".to_owned(), name.trim().to_owned()]);
    Ok(arguments)
}

/// A type's or member's source (`show`), or which assembly declares it (`holder`), for one of the game's repositories.
pub fn their_code(
    game: &str,
    repository: &str,
    kind: &str,
    name: &str,
    listener: Option<kit::Listener>,
) -> Result<Answer, Failure> {
    let found = games::named_repository(game, repository)?;
    let Some(tool) = tool(game, OTHER_CODE, kind, READS)? else { return Ok(Answer::missing()) };
    let arguments = their_arguments(&tool, kind, &found.path, name).map_err(Failure::refused)?;
    let answer = Answer::of(&kit::run_hearing(&tool, &arguments, listener)?);
    if kind == "holder" {
        remember_holders(&answer.data);
    }
    Ok(answer)
}

fn remember_holders(data: &Value) {
    let paths = data["holders"].as_array().map_or(&[][..], Vec::as_slice).iter().filter_map(|h| h["path"].as_str());
    if let Ok(mut held) = HELD.lock() {
        held.extend(paths.map(str::to_owned));
    }
}

/// Whether `holder` named this assembly in this run of the program.
pub fn was_held(path: &str) -> bool {
    HELD.lock().is_ok_and(|held| held.contains(path))
}

/// Decompiles an assembly `holder` named, into the kit's cache, on the owner's press.
pub fn decompile(
    game: &str,
    repository: &str,
    assembly: &str,
    listener: Option<kit::Listener>,
) -> Result<Answer, Failure> {
    let found = games::named_repository(game, repository)?;
    if !was_held(assembly) {
        return Err(Failure::refused(
            "only an assembly the tools named as holding the code can be decompiled".to_owned(),
        ));
    }
    let Some(tool) = tool(game, OTHER_CODE, "decompile", RUNS)? else { return Ok(Answer::missing()) };
    let arguments = Args::new(&tool, "decompile").root(&found.path).given("--assembly", assembly).json();
    Ok(Answer::of(&kit::run_hearing(&tool, &arguments, listener)?))
}

/// Keeps the new builds of the game and the mods a repository ties into (`rimworld-archive snapshot`, phobos-modkit 1.51.0's
/// `updates` surface), on the owner's press, so an update can be compared: it writes only into the tools' archive.
pub fn keep_builds(game: &str, repository: &str, listener: Option<kit::Listener>) -> Result<Answer, Failure> {
    let found = games::named_repository(game, repository)?;
    let Some(tool) = tool(game, UPDATES, "snapshot", "writes")? else { return Ok(Answer::missing()) };
    let arguments = Args::new(&tool, "snapshot").root(&found.path).json();
    Ok(Answer::of(&kit::run_hearing(&tool, &arguments, listener)?))
}

/// The arguments for the kept builds (no file) or a comparison of one file's last two, optionally one member's diff.
pub fn update_arguments(
    tool: &str,
    file: Option<&str>,
    owner: Option<&str>,
    member: Option<&str>,
) -> Result<Vec<String>, String> {
    let Some(file) = file else { return Ok(Args::new(tool, "list").pair("--top", "200").json()) };
    if !file_name(file) {
        return Err("that is not a kept file's name".to_owned());
    }
    let mut arguments = Args::new(tool, "compare").pair("--top", "200");
    if let Some(owner) = owner {
        if !owner_id(owner) {
            return Err("that is not a mod's id".to_owned());
        }
        arguments = arguments.given("--owner", owner);
    }
    if let Some(member) = member {
        if !type_name(member) {
            return Err("that is not the name of a type or a member".to_owned());
        }
        arguments = arguments.given("--show", member.trim());
    }
    let mut arguments = arguments.json();
    arguments.extend(["--".to_owned(), file.to_owned()]);
    Ok(arguments)
}

/// The builds the tools have kept, or what changed in one file's last update.
pub fn updates(
    game: &str,
    file: Option<&str>,
    owner: Option<&str>,
    member: Option<&str>,
    listener: Option<kit::Listener>,
) -> Result<Answer, Failure> {
    let (report, effect) = if file.is_some() { ("compare", RUNS) } else { ("list", READS) };
    let Some(tool) = tool(game, UPDATES, report, effect)? else { return Ok(Answer::missing()) };
    let arguments = update_arguments(&tool, file, owner, member).map_err(Failure::refused)?;
    Ok(Answer::of(&kit::run_hearing(&tool, &arguments, listener)?))
}

/// The arguments for the check after an update: the repository, and the moment updates count from when the window gives one.
pub fn update_check_arguments(tool: &str, root: &std::path::Path, since: Option<&str>) -> Result<Vec<String>, String> {
    let mut arguments = Args::command(tool).root(root);
    if let Some(since) = since {
        if !checks::moment(since) {
            return Err("that is not a moment".to_owned());
        }
        arguments = arguments.given("--since", since);
    }
    Ok(arguments.json())
}

/// What the updates mean for a repository's code (0.35.0; phobos-modkit 1.61.1's `update-check` surface), on the owner's press:
/// whether our patches' targets and XML patches still find what they name, whether an update touched a temporary patch's fault,
/// and how big each update was. It decompiles builds not yet decompiled into the kit's cache, and otherwise only reads.
pub fn update_check(
    game: &str,
    repository: &str,
    since: Option<&str>,
    listener: Option<kit::Listener>,
) -> Result<Answer, Failure> {
    let found = games::named_repository(game, repository)?;
    let Some(tool) = tool(game, UPDATE_CHECK, "", RUNS)? else { return Ok(Answer::missing()) };
    let arguments = update_check_arguments(&tool, &found.path, since).map_err(Failure::refused)?;
    let answer = Answer::of(&kit::run_hearing(&tool, &arguments, listener)?);
    if answer.ok {
        remember_check(game, repository, &answer.report);
        remember_touched(game, repository, &answer.data);
    }
    Ok(answer)
}

#[cfg(test)]
#[path = "tests/other_code_page.rs"]
mod tests;
