//! The Tests page: each repository's in-game test list, what the game has seen working, and the owner's verdicts.
//!
//! Reading runs the kit's `test-pass report`, which only reads. Recording a verdict is the one thing this program writes: a
//! line appended to a file in its own data folder, one per repository (`test-verdicts/<repository>.jsonl`), which the kit's
//! `test-pass apply` later writes into the test list when an agent session or the owner runs it. Nothing here touches a game, a
//! save or a repository.

use crate::failure::{Failure, FailureCode};
use crate::games::{self, Repository};
use crate::kit;
use serde::Serialize;
use serde_json::Value;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const TOOL: &str = "test-pass";
const EVIDENCE_MAP: [&str; 2] = ["config", "test-evidence.json"];
const VERDICTS_FOLDER: &str = "test-verdicts";
const VERDICT_FORMAT: u32 = 1;
const VERDICTS: [&str; 3] = ["passed", "failed", "cleared"];
const MAX_ROW_ID: usize = 16;
const MAX_NOTE: usize = 300;
const MAX_ROWS: &str = "5000";

/// One repository's test list, as the kit reads it.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct TestList {
    pub repository: String,
    pub title: String,
    pub rows: Value,
    pub command_line: String,
}

/// A verdict as recorded.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Recorded {
    pub row: String,
    pub verdict: String,
    pub time: String,
}

/// The repositories of one game that keep a test list.
fn with_test_lists(game: &str) -> Result<Vec<Repository>, Failure> {
    let listed = games::load()?.unwrap_or_default();
    let found = listed.into_iter().find(|g| g.id == game);
    Ok(found.map(|g| g.repositories.into_iter().filter(|r| has_test_list(&r.path)).collect()).unwrap_or_default())
}

fn has_test_list(path: &Path) -> bool {
    path.join(EVIDENCE_MAP[0]).join(EVIDENCE_MAP[1]).is_file()
}

/// The verdicts file for a repository, in this program's own data folder.
pub fn verdicts_file(data: &Path, repository: &str) -> PathBuf {
    data.join(VERDICTS_FOLDER).join(format!("{repository}.jsonl"))
}

/// Every test list of one game.
pub fn read(game: &str, data: &Path) -> Result<Vec<TestList>, Failure> {
    let mut lists = Vec::new();
    for repository in with_test_lists(game)? {
        let verdicts = verdicts_file(data, &repository.name);
        let arguments = vec![
            TOOL.to_owned(),
            "report".to_owned(),
            "--root".to_owned(),
            repository.path.display().to_string(),
            "--verdicts".to_owned(),
            verdicts.display().to_string(),
            "--all".to_owned(),
            "--top".to_owned(),
            MAX_ROWS.to_owned(),
            "--json".to_owned(),
        ];
        let answer = kit::run(TOOL, &arguments)?;
        lists.push(TestList {
            title: answer["report"]["title"].as_str().unwrap_or_default().to_owned(),
            rows: answer["data"]["rows"].clone(),
            command_line: format!("python scripts/test-pass.py report   (in {})", repository.name),
            repository: repository.name,
        });
    }
    Ok(lists)
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
    let refused = |detail: &str| Failure::new(FailureCode::Refused, detail);
    if !with_test_lists(game)?.iter().any(|r| r.name == repository) {
        return Err(refused("that repository keeps no test list"));
    }
    let line = verdict_line(row, verdict, note, &now_utc()).map_err(|detail| refused(&detail))?;
    let file = verdicts_file(data, repository);
    append(&file, &line)
        .map_err(|problem| Failure::new(FailureCode::WriteFailed, format!("{}: {problem}", file.display())))?;
    Ok(Recorded { row: row.to_owned(), verdict: verdict.to_owned(), time: now_utc() })
}

fn append(file: &Path, line: &str) -> std::io::Result<()> {
    if let Some(folder) = file.parent() {
        fs::create_dir_all(folder)?;
    }
    let mut handle = OpenOptions::new().create(true).append(true).open(file)?;
    handle.write_all(line.as_bytes())?;
    handle.write_all(b"\n")
}

/// The verdict as one JSON line, or why it is refused.
pub fn verdict_line(row: &str, verdict: &str, note: &str, time: &str) -> Result<String, String> {
    if row.is_empty() || row.len() > MAX_ROW_ID || !row.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err(format!("{row:?} is not a test row's number"));
    }
    if !VERDICTS.contains(&verdict) {
        return Err(format!("{verdict:?} is not a verdict"));
    }
    let note: String = note.split_whitespace().collect::<Vec<_>>().join(" ");
    if note.chars().count() > MAX_NOTE {
        return Err(format!("the note is longer than {MAX_NOTE} characters"));
    }
    let value =
        serde_json::json!({"format": VERDICT_FORMAT, "time": time, "row": row, "verdict": verdict, "note": note});
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
