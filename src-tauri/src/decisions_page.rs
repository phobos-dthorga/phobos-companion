//! The Decisions page (the owner's go-ahead, 19 Nov 2026; `docs/later.md`, item 4): the questions agents left for the owner in each
//! repository's `config/decisions.json`, with their options and the agent's lean, from the kit's `decisions list`, over every
//! repository on the owner's list and this program's own. Answering runs the kit's `decisions answer`, which appends one line to the
//! answers file in this program's folder, only when the owner presses Decide, only for a repository the list names, and only while
//! the kit's manifest still calls that report `writes`. Nothing in a repository changes: an agent acts on the answer in a commit.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit::{self, Outcome};
use serde::Serialize;
use serde_json::Value;
use std::path::PathBuf;

const TOOL: &str = "decisions";
const LIST: &str = "list";
const ANSWER: &str = "answer";
const MAX_ID: usize = 80;
const MAX_WORDS: usize = 4000;

/// What a press of Decide did.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct AnswerResult {
    pub ok: bool,
    pub refusal: Option<String>,
}

/// Every repository on the owner's list that is on this PC, and this program's own, each once.
fn roots() -> Result<Vec<(String, PathBuf)>, Failure> {
    let mut found: Vec<(String, PathBuf)> =
        games::every_repository()?.into_iter().filter(|r| r.path.is_dir()).map(|r| (r.name, r.path)).collect();
    let own = companion_core::repository_root();
    if let Some(name) = own.canonicalize().ok().and_then(|p| p.file_name().map(|n| n.to_string_lossy().into_owned()))
        && !found.iter().any(|(known, _)| *known == name)
    {
        found.push((name, own));
    }
    Ok(found)
}

pub fn list_arguments(roots: &[PathBuf]) -> Vec<String> {
    Args::new(TOOL, LIST).roots(roots.iter().map(PathBuf::as_path)).json()
}

/// A decision's or option's id, as the kit's config allows them.
pub fn decision_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_ID
        && id.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        && !id.starts_with('-')
}

pub fn answer_arguments(root: &std::path::Path, id: &str, option: &str, words: &str) -> Result<Vec<String>, String> {
    if !decision_id(id) || !decision_id(option) {
        return Err("that is not a decision or an option".to_owned());
    }
    if words.chars().count() > MAX_WORDS {
        return Err(format!("keep the words under {MAX_WORDS} characters"));
    }
    let arguments = Args::new(TOOL, ANSWER).root(root).given("--id", id).given("--option", option);
    let words = checks::one_line(words);
    Ok(if words.is_empty() { arguments.json() } else { arguments.given("--words", &words).json() })
}

/// Every decision in every repository, open ones first, with any answer.
pub fn read() -> Result<Value, Failure> {
    let paths: Vec<PathBuf> = roots()?.into_iter().map(|(_, path)| path).collect();
    Ok(kit::run(TOOL, &list_arguments(&paths))?["data"].clone())
}

/// Records the owner's answer to one decision in one repository.
pub fn answer(repository: &str, id: &str, option: &str, words: &str) -> Result<AnswerResult, Failure> {
    if !checks::plain_name(repository) {
        return Err(Failure::refused("that is not a repository's name"));
    }
    let root = roots()?
        .into_iter()
        .find(|(name, _)| name == repository)
        .map(|(_, path)| path)
        .ok_or_else(|| Failure::refused(format!("{repository} is not on the list")))?;
    kit::allowed_by_manifest(&kit::read_manifest()?, TOOL, ANSWER).map_err(Failure::refused)?;
    let arguments = answer_arguments(&root, id, option, words).map_err(Failure::refused)?;
    let outcome = Outcome::of(&kit::run(TOOL, &arguments)?);
    Ok(AnswerResult { ok: outcome.ok, refusal: outcome.refusal })
}

#[cfg(test)]
#[path = "tests/decisions_page.rs"]
mod tests;
