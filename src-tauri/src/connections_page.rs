//! How code connects: the code viewer's "How it connects" view and the Code map page.
//!
//! Every request runs the kit's `connections`, which only reads and names no game: any repository of any game is read the same way,
//! C# exactly from its built assemblies, XML Defs, Lua and Python by their own rules, each connection marked exact or by name. The
//! host checks every request before the kit sees it: the repository must be one of the game's, a thing's id must have the tools'
//! shape, a commit must be a commit, and a search one line of a sane length.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit::{self, Outcome};
use serde::Serialize;
use serde_json::Value;
use std::path::Path;

const TOOL: &str = "connections";
/// How many commits of a thing's history the window can page through (kit 1.40.0's --limit).
const HISTORY_LIMIT: &str = "200";

/// What the kit answered, or why it refused.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Answer {
    pub ok: bool,
    pub refusal: Option<String>,
    pub data: Value,
}

/// One question the window may ask, checked.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Question {
    Summary,
    Find(String),
    Around(String),
    Flow(String, u8),
    Changed(String),
    History(String),
    /// Every name in one C# file, and where each is declared (0.79.0; kit 1.111.0's names reader): the file, and the commit to
    /// read it at, or none for the file as it stands.
    Names(String, Option<String>),
}

pub fn arguments(root: &Path, question: &Question) -> Result<Vec<String>, String> {
    let arguments = match question {
        Question::Summary => Args::new(TOOL, "summary").root(root),
        Question::Find(name) if checks::search_pattern(name) => {
            Args::new(TOOL, "find").root(root).given("--name", name.trim()).pair("--top", "80")
        }
        Question::Find(_) => return Err("a search is one line of text".to_owned()),
        Question::Around(node) if checks::node_id(node) => Args::new(TOOL, "around").root(root).given("--node", node),
        Question::Flow(node, depth) if checks::node_id(node) && (1..=3).contains(depth) => {
            Args::new(TOOL, "flow").root(root).given("--node", node).pair("--depth", &depth.to_string())
        }
        Question::History(node) if checks::node_id(node) => {
            Args::new(TOOL, "history").root(root).given("--node", node).pair("--limit", HISTORY_LIMIT)
        }
        Question::Around(_) | Question::Flow(..) | Question::History(_) => {
            return Err("that is not a thing the tools can show".to_owned());
        }
        Question::Changed(commit) if checks::commit_hash(commit) => {
            Args::new(TOOL, "changed").root(root).given("--commit", commit)
        }
        Question::Changed(_) => return Err("that is not a commit".to_owned()),
        Question::Names(file, commit)
            if checks::repository_file(file)
                && file.to_ascii_lowercase().ends_with(".cs")
                && commit.as_deref().is_none_or(checks::commit_hash) =>
        {
            let named = Args::new(TOOL, "names").root(root).given("--file", file);
            match commit {
                Some(commit) => named.given("--commit", commit),
                None => named,
            }
        }
        Question::Names(..) => return Err("names are read from one C# file of the repository, at a commit".to_owned()),
    };
    Ok(arguments.json())
}

/// Asks the kit one question about one of the game's repositories.
pub fn ask(
    game: &str,
    repository: &str,
    question: &Question,
    listener: Option<kit::Listener>,
) -> Result<Answer, Failure> {
    let found = games::named_repository(game, repository)?;
    let arguments = arguments(&found.path, question).map_err(Failure::refused)?;
    let answer = kit::run_hearing(TOOL, &arguments, listener)?;
    Ok(answer_of(&answer))
}

fn answer_of(answer: &Value) -> Answer {
    let outcome = Outcome::of(answer);
    Answer { ok: outcome.ok, refusal: outcome.refusal, data: answer["data"].clone() }
}

/// The question the window named, with its words checked by `arguments` before it runs. `commit` is only for names.
pub fn question(
    kind: &str,
    value: Option<String>,
    depth: Option<u8>,
    commit: Option<String>,
) -> Result<Question, Failure> {
    let value = || value.clone().ok_or_else(|| Failure::refused(format!("{kind} needs something to ask about")));
    Ok(match kind {
        "summary" => Question::Summary,
        "find" => Question::Find(value()?),
        "around" => Question::Around(value()?),
        "flow" => Question::Flow(value()?, depth.unwrap_or(2)),
        "changed" => Question::Changed(value()?),
        "history" => Question::History(value()?),
        "names" => Question::Names(value()?, commit),
        other => return Err(Failure::refused(format!("{other:?} is not a question the tools answer"))),
    })
}

#[cfg(test)]
#[path = "tests/connections_page.rs"]
mod tests;
