//! The Picks page (0.55.0; the owner, 23 Nov 2026: "Go ahead and build the picks page", after choosing in its design that picks
//! come from a file each repository keeps and that a pick is kept as an answer): the pictures and sounds a repository's art tools
//! offered in its `config/picks.json`, each with its tries, from the kit's `picks list`, over every repository on the owner's list and
//! this program's own. Every file a pick names may then be shown (`viewable.rs`).
//!
//! Picking runs the kit's `picks answer`, which appends one line to the answers file in this program's folder, only when the owner
//! presses a pick, only for a repository the list names, and only while the kit's manifest still calls that report `writes`.
//! Nothing in a repository changes: a session applies the pick and settles it in a commit.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit::{self, Outcome};
use serde::Serialize;
use serde_json::Value;
use std::path::{Path, PathBuf};

const TOOL: &str = "picks";
const LIST: &str = "list";
const ANSWER: &str = "answer";
const CONFIG: [&str; 2] = ["config", "picks.json"];
const MAX_ID: usize = 80;
const MAX_WORDS: usize = 4000;

/// What a press of a pick did.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct PickResult {
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

/// Whether a repository keeps a picks file: only those are asked.
fn has_picks(root: &Path) -> bool {
    CONFIG.iter().fold(root.to_path_buf(), |path, part| path.join(part)).is_file()
}

pub fn list_arguments(roots: &[PathBuf]) -> Vec<String> {
    Args::new(TOOL, LIST).roots(roots.iter().map(PathBuf::as_path)).flag("--no-redact").json()
}

/// A pick's or a try's id, as the kit's file allows them; "none" is a try's answer too.
pub fn pick_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_ID
        && id.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b"._-".contains(&b))
        && id.as_bytes()[0].is_ascii_alphanumeric()
}

pub fn answer_arguments(root: &Path, id: &str, pick: &str, words: &str) -> Result<Vec<String>, String> {
    if !pick_id(id) || !pick_id(pick) {
        return Err("that is not a pick or one of its tries".to_owned());
    }
    if words.chars().count() > MAX_WORDS {
        return Err(format!("keep the words under {MAX_WORDS} characters"));
    }
    let arguments = Args::new(TOOL, ANSWER).root(root).given("--id", id).given("--pick", pick);
    let words = checks::one_line(words);
    Ok(if words.is_empty() { arguments.json() } else { arguments.given("--words", &words).json() })
}

/// Every file the list names: each pick's file in use and each try's, for the window to draw or play.
pub fn files_named(data: &Value) -> Vec<PathBuf> {
    let list = |value: &Value| value.as_array().cloned().unwrap_or_default();
    list(&data["repositories"])
        .iter()
        .flat_map(|repository| list(&repository["picks"]))
        .flat_map(|pick| {
            let in_use = pick["inUse"].as_str().map(PathBuf::from);
            let tries: Vec<PathBuf> =
                list(&pick["tries"]).iter().filter_map(|t| t["path"].as_str().map(PathBuf::from)).collect();
            in_use.into_iter().chain(tries)
        })
        .collect()
}

/// Every pick in every repository that keeps a picks file, waiting ones first, with any answer.
pub fn read() -> Result<Value, Failure> {
    let paths: Vec<PathBuf> = roots()?.into_iter().map(|(_, path)| path).filter(|path| has_picks(path)).collect();
    if paths.is_empty() {
        return Ok(serde_json::json!({"waiting": 0, "repositories": []}));
    }
    let answer = kit::run(TOOL, &list_arguments(&paths))?;
    Outcome::required(&answer)?;
    let data = answer["data"].clone();
    crate::viewable::remember(files_named(&data));
    Ok(data)
}

/// Records the owner's pick, a try or "none", in one repository.
pub fn answer(repository: &str, id: &str, pick: &str, words: &str) -> Result<PickResult, Failure> {
    if !checks::plain_name(repository) {
        return Err(Failure::refused("that is not a repository's name"));
    }
    let root = roots()?
        .into_iter()
        .find(|(name, _)| name == repository)
        .map(|(_, path)| path)
        .ok_or_else(|| Failure::refused(format!("{repository} is not on the list")))?;
    kit::allowed_by_manifest(&kit::read_manifest()?, TOOL, ANSWER).map_err(Failure::refused)?;
    let arguments = answer_arguments(&root, id, pick, words).map_err(Failure::refused)?;
    let outcome = Outcome::of(&kit::run(TOOL, &arguments)?);
    Ok(PickResult { ok: outcome.ok, refusal: outcome.refusal })
}

#[cfg(test)]
#[path = "tests/picks_page.rs"]
mod tests;
