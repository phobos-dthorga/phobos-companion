//! How code connects: the code viewer's "How it connects" view and the Code map page.
//!
//! Every request runs the kit's `connections`, which only reads: any repository of any game is read the same way, C# exactly from
//! its built assemblies, XML Defs, Lua and Python by their own rules, each connection marked exact or by name. **Every question
//! names the game** (0.83.0; kit 1.117.0): a game whose adapter has a table of them adds the names that cross between its data
//! files and its code (a translation key the code asks for, a class a Def names), as things, connections and names to follow, and
//! `calls` may read the game's own assemblies, as files, where its adapter offers them. A game with neither is read as before. The
//! host checks every request before the kit sees it: the game must be one it knows, the repository one of the game's, a thing's id
//! must have the tools' shape, a commit must be a commit, and a search one line of a sane length.

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
/// The files whose names the kit reads: C# exactly (1.111.0), Lua, Python and XML by name (1.115.0), and a data file by the
/// rules of the game's table, where it has one (1.117.0).
const NAMED: [&str; 8] = [".cs", ".lua", ".py", ".xml", ".json", ".ts", ".svelte", ".rs"];

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
    /// What one commit did to its C# methods' calls, and the rings of calls it made or cut (0.82.0; kit 1.116.0): the commit.
    /// The game named with every question is the one whose own assemblies the kit may read for the game's side of a ring.
    Calls(String),
}

pub fn arguments(root: &Path, game: &str, question: &Question) -> Result<Vec<String>, String> {
    if !games::valid_id(game) {
        return Err("that is not a game the tools know".to_owned());
    }
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
                && NAMED.iter().any(|suffix| file.to_ascii_lowercase().ends_with(suffix))
                && commit.as_deref().is_none_or(checks::commit_hash) =>
        {
            let named = Args::new(TOOL, "names").root(root).given("--file", file);
            match commit {
                Some(commit) => named.given("--commit", commit),
                None => named,
            }
        }
        Question::Names(..) => {
            return Err(
                "names are read from one C#, Lua, Python, XML or data file of the repository, at a commit".to_owned()
            );
        }
        Question::Calls(commit) if checks::commit_hash(commit) => {
            Args::new(TOOL, "calls").root(root).given("--commit", commit)
        }
        Question::Calls(_) => return Err("calls are read from one commit of one game's repository".to_owned()),
    };
    Ok(arguments.given("--game", game).json())
}

/// Asks the kit one question about one of the game's repositories.
pub fn ask(
    game: &str,
    repository: &str,
    question: &Question,
    listener: Option<kit::Listener>,
) -> Result<Answer, Failure> {
    let found = games::named_repository(game, repository)?;
    let arguments = arguments(&found.path, game, question).map_err(Failure::refused)?;
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
        "calls" => Question::Calls(value()?),
        other => return Err(Failure::refused(format!("{other:?} is not a question the tools answer"))),
    })
}

#[cfg(test)]
#[path = "tests/connections_page.rs"]
mod tests;
