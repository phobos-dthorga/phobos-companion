//! Reading a repository's history without changing it.

use crate::process::hide_console;
use serde::Serialize;
use std::io::ErrorKind;
use std::path::Path;
use std::process::{Command, Output};

const FIELD: char = '\u{1f}';
const RECORD: char = '\u{1e}';
const LOG_FORMAT: &str = "--format=%h%x1f%ct%x1f%s%x1e";
const NO_COMMITS: &str = "does not have any commits yet";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Commit {
    pub hash: String,
    pub unix: i64,
    pub subject: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RepositoryProblem {
    Missing,
    NotARepository,
    GitMissing,
    GitFailed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReadFailure {
    pub problem: RepositoryProblem,
    pub detail: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Reading {
    pub commits: Vec<Commit>,
    pub uncommitted: usize,
}

/// The newest commits, and how many files have changes not yet committed.
pub fn read(path: &Path, limit: usize) -> Result<Reading, ReadFailure> {
    let failed = |problem, detail: String| ReadFailure { problem, detail };
    if !path.is_dir() {
        return Err(failed(RepositoryProblem::Missing, path.display().to_string()));
    }
    if !path.join(".git").exists() {
        return Err(failed(RepositoryProblem::NotARepository, path.display().to_string()));
    }
    let log = git(path, &["log", "-n", &limit.to_string(), LOG_FORMAT])?;
    let commits = if log.status.success() {
        parse_log(&String::from_utf8_lossy(&log.stdout))
    } else {
        let error = String::from_utf8_lossy(&log.stderr).into_owned();
        if !error.contains(NO_COMMITS) {
            return Err(failed(RepositoryProblem::GitFailed, error));
        }
        Vec::new()
    };
    let status = git(path, &["status", "--porcelain"])?;
    if !status.status.success() {
        return Err(failed(RepositoryProblem::GitFailed, String::from_utf8_lossy(&status.stderr).into_owned()));
    }
    Ok(Reading { commits, uncommitted: String::from_utf8_lossy(&status.stdout).lines().count() })
}

/// Runs git so that reading takes no locks and starts no background watcher.
fn git(path: &Path, args: &[&str]) -> Result<Output, ReadFailure> {
    let mut command = Command::new("git");
    command.args(["--no-optional-locks", "-c", "core.fsmonitor=false", "-C"]).arg(path).args(args).env("LC_ALL", "C");
    hide_console(&mut command);
    command.output().map_err(|problem| {
        let kind = if problem.kind() == ErrorKind::NotFound {
            RepositoryProblem::GitMissing
        } else {
            RepositoryProblem::GitFailed
        };
        ReadFailure { problem: kind, detail: problem.to_string() }
    })
}

fn parse_log(text: &str) -> Vec<Commit> {
    text.split(RECORD)
        .filter_map(|record| {
            let mut fields = record.trim().splitn(3, FIELD);
            let hash = fields.next()?.to_owned();
            let unix = fields.next()?.parse().ok()?;
            let subject = fields.next()?.to_owned();
            Some(Commit { hash, unix, subject })
        })
        .collect()
}

#[cfg(test)]
#[path = "tests/git.rs"]
mod tests;
