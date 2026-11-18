//! The Tests page: each repository's in-game test list, what the game has seen working, and the owner's verdicts.
//!
//! Reading runs the kit's `test-pass report`, which only reads. Recording is the only writing this program does: the owner's
//! verdict on a row, and since 0.9.0 their decision on a note no row names ("make a row" or "no row needed"), each a line appended
//! to a file in its own data folder, one per repository (`test-verdicts/<repository>.jsonl` and
//! `test-key-decisions/<repository>.jsonl`). The kit's `test-pass` reads both; `apply` later writes verdicts into the test list
//! when an agent session or the owner runs it. Nothing here touches a game, a save or a repository.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::{Failure, FailureCode};
use companion_core::games::{self, Repository};
use companion_core::kit;
use serde::Serialize;
use serde_json::Value;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const TOOL: &str = "test-pass";
const EVIDENCE_MAP: [&str; 2] = ["config", "test-evidence.json"];
const VERDICTS_FOLDER: &str = "test-verdicts";
const DECISIONS_FOLDER: &str = "test-key-decisions";
const LINE_FORMAT: u32 = 1;
const VERDICTS: [&str; 3] = ["passed", "failed", "cleared"];
const DECISIONS: [&str; 3] = ["make-row", "no-row", "cleared"];
const MAX_ROW_ID: usize = 16;
const MAX_KEY: usize = 160;
const MAX_NOTE: usize = 300;
const MAX_ROWS: &str = "5000";

/// One repository's test list, as the kit reads it.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct TestList {
    pub repository: String,
    pub title: String,
    pub rows: Value,
    /// Notes no row names, with the owner's decision on each (kit 1.19.0).
    pub unrowed: Value,
    /// Notes that came without the one that should come before them on the same thing (kit 1.19.0).
    pub order_problems: Value,
    pub command_line: String,
}

/// A verdict as recorded.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Recorded {
    pub row: String,
    pub verdict: String,
    pub time: String,
}

/// A decision on a note no row names, as recorded.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct RecordedDecision {
    pub key: String,
    pub decision: String,
    pub time: String,
}

/// The repositories of one game that keep a test list.
fn with_test_lists(game: &str) -> Result<Vec<Repository>, Failure> {
    Ok(games::repositories_of(game)?.into_iter().filter(|r| has_test_list(&r.path)).collect())
}

fn has_test_list(path: &Path) -> bool {
    path.join(EVIDENCE_MAP[0]).join(EVIDENCE_MAP[1]).is_file()
}

/// The verdicts file for a repository, in this program's own data folder.
pub fn verdicts_file(data: &Path, repository: &str) -> PathBuf {
    data.join(VERDICTS_FOLDER).join(format!("{repository}.jsonl"))
}

/// The decisions file for a repository, beside its verdicts.
pub fn decisions_file(data: &Path, repository: &str) -> PathBuf {
    data.join(DECISIONS_FOLDER).join(format!("{repository}.jsonl"))
}

/// Every test list of one game.
pub fn read(game: &str, data: &Path) -> Result<Vec<TestList>, Failure> {
    let mut lists = Vec::new();
    for repository in with_test_lists(game)? {
        let arguments = Args::new(TOOL, "report")
            .root(&repository.path)
            .path("--verdicts", &verdicts_file(data, &repository.name))
            .path("--decisions", &decisions_file(data, &repository.name))
            .flag("--all")
            .pair("--top", MAX_ROWS)
            .json();
        let answer = kit::run(TOOL, &arguments)?;
        lists.push(TestList {
            title: answer["report"]["title"].as_str().unwrap_or_default().to_owned(),
            rows: answer["data"]["rows"].clone(),
            unrowed: list_or_empty(&answer["data"]["unrowed"]),
            order_problems: list_or_empty(&answer["data"]["order_problems"]),
            command_line: format!("python scripts/test-pass.py report   (in {})", repository.name),
            repository: repository.name,
        });
    }
    Ok(lists)
}

/// A list from the kit, or an empty one from a kit too old to send it.
fn list_or_empty(value: &Value) -> Value {
    if value.is_array() { value.clone() } else { Value::Array(Vec::new()) }
}

/// Records one verdict, after checking the repository keeps a test list and the verdict is one the kit reads.
pub fn record(
    game: &str,
    repository: &str,
    row: &str,
    verdict: &str,
    note: &str,
    data: &Path,
) -> Result<Recorded, Failure> {
    let line = verdict_line(row, verdict, note, &now_utc());
    let time = write_line(game, repository, line, &verdicts_file(data, repository))?;
    Ok(Recorded { row: row.to_owned(), verdict: verdict.to_owned(), time })
}

/// Records one decision on a note no row names, with the same checks.
pub fn record_decision(
    game: &str,
    repository: &str,
    key: &str,
    decision: &str,
    note: &str,
    data: &Path,
) -> Result<RecordedDecision, Failure> {
    let line = decision_line(key, decision, note, &now_utc());
    let time = write_line(game, repository, line, &decisions_file(data, repository))?;
    Ok(RecordedDecision { key: key.to_owned(), decision: decision.to_owned(), time })
}

/// Appends a checked line to a file of this program's own, once the repository is known to keep a test list.
fn write_line(game: &str, repository: &str, line: Result<String, String>, file: &Path) -> Result<String, Failure> {
    if !with_test_lists(game)?.iter().any(|r| r.name == repository) {
        return Err(Failure::refused("that repository keeps no test list"));
    }
    let line = line.map_err(Failure::refused)?;
    append(file, &line)
        .map_err(|problem| Failure::new(FailureCode::WriteFailed, format!("{}: {problem}", file.display())))?;
    Ok(now_utc())
}

fn append(file: &Path, line: &str) -> std::io::Result<()> {
    if let Some(folder) = file.parent() {
        fs::create_dir_all(folder)?;
    }
    let mut handle = OpenOptions::new().create(true).append(true).open(file)?;
    handle.write_all(line.as_bytes())?;
    handle.write_all(b"\n")
}

/// A note folded onto one line, or why it is refused.
fn one_line_note(note: &str) -> Result<String, String> {
    let note = checks::one_line(note);
    if note.chars().count() > MAX_NOTE {
        return Err(format!("the note is longer than {MAX_NOTE} characters"));
    }
    Ok(note)
}

/// The verdict as one JSON line, or why it is refused.
pub fn verdict_line(row: &str, verdict: &str, note: &str, time: &str) -> Result<String, String> {
    if row.is_empty() || row.len() > MAX_ROW_ID || !row.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err(format!("{row:?} is not a test row's number"));
    }
    if !VERDICTS.contains(&verdict) {
        return Err(format!("{verdict:?} is not a verdict"));
    }
    let note = one_line_note(note)?;
    let value = serde_json::json!({"format": LINE_FORMAT, "time": time, "row": row, "verdict": verdict, "note": note});
    Ok(value.to_string())
}

/// The decision as one JSON line, or why it is refused. A key is a note's dotted name, as the game writes it.
pub fn decision_line(key: &str, decision: &str, note: &str, time: &str) -> Result<String, String> {
    let fits = |c: char| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_');
    if key.is_empty() || key.len() > MAX_KEY || !key.chars().all(fits) {
        return Err(format!("{key:?} is not a note's key"));
    }
    if !DECISIONS.contains(&decision) {
        return Err(format!("{decision:?} is not a decision"));
    }
    let note = one_line_note(note)?;
    let value =
        serde_json::json!({"format": LINE_FORMAT, "time": time, "key": key, "decision": decision, "note": note});
    Ok(value.to_string())
}

/// Now, as the kit reads it: "2026-11-17T12:05:00Z".
fn now_utc() -> String {
    let seconds = SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_secs());
    format_utc(seconds)
}

/// Seconds since 1970 as an ISO time in UTC (Howard Hinnant's civil-from-days arithmetic).
pub fn format_utc(seconds: u64) -> String {
    let days = (seconds / 86_400) as i64;
    let rest = seconds % 86_400;
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let day_of_era = z - era * 146_097;
    let year_of_era = (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_index = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_index + 2) / 5 + 1;
    let month = if month_index < 10 { month_index + 3 } else { month_index - 9 };
    let year = year_of_era + era * 400 + i64::from(month <= 2);
    format!("{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}Z", rest / 3600, rest % 3600 / 60, rest % 60)
}

#[cfg(test)]
#[path = "tests/tests_page.rs"]
mod tests;
