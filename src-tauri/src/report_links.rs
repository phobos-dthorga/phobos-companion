//! The Logs page's report links (0.65.0; `docs/online.md`, O4; the owner's choice of 23 Nov 2026: pre-filled reports to our own
//! repositories, and for other authors their existing issues and their blank new-issue form, on the Logs page).
//!
//! **Nothing is ever posted.** The program opens GitHub's new-issue form in the person's browser; they read it and press Submit.
//! The kit's `issue-links where` says for each mod a fault names whether it is ours or theirs and which repository; the host
//! remembers that answer, and opens only an address for a repository it named, of the shape it expects. Listing another author's
//! issues reads GitHub keyless, only on a press, and only while **Their reports** is on in Settings → Going online.

use companion_core::args::Args;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit;
use companion_core::online;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::mod_list_page;

const TOOL: &str = "issue-links";
pub const KIND: &str = "their-reports";
const MAX_MODS: usize = 60;
const MAX_NAME: usize = 200;
const MAX_TITLE: usize = 200;
const MAX_BODY: usize = 60_000;
const DRAFTS: &str = "report-drafts";

/// (game, owner/repo, "ours" or "theirs"), from the kit's last `where` for each game.
static NAMED: Mutex<Vec<(String, String, String)>> = Mutex::new(Vec::new());

fn named_as(game: &str, repository: &str, whose: &str) -> bool {
    NAMED.lock().map(|n| n.iter().any(|(g, r, w)| g == game && r == repository && w == whose)).unwrap_or(false)
}

fn either(game: &str, repository: &str) -> bool {
    named_as(game, repository, "ours") || named_as(game, repository, "theirs")
}

fn open(address: &str) -> Result<(), Failure> {
    companion_core::process::open_address(address)
        .map_err(|problem| Failure::refused(format!("The browser could not be asked to open the page: {problem}")))
}

/// The arguments asking where each mod is reported.
pub fn where_arguments(game: &games::GamePlaces, roots: &[PathBuf], mods: &[String]) -> Vec<String> {
    let mut arguments = mod_list_page::named(Args::new(TOOL, "where"), game).roots(roots.iter().map(PathBuf::as_path));
    for name in mods {
        arguments = arguments.given("--mod", name);
    }
    arguments.json()
}

/// Ours, theirs or unknown for each mod the window names (each one line, at most 60), remembered for the presses that follow.
pub fn places(game: &str, mods: Vec<String>) -> Result<Value, Failure> {
    if mods.len() > MAX_MODS || mods.iter().any(|m| m.is_empty() || m.len() > MAX_NAME || checks::one_line(m) != *m) {
        return Err(Failure::refused("a mod's name must be one line of a sane length"));
    }
    let found = mod_list_page::places(game)?;
    let roots: Vec<PathBuf> =
        games::repositories_of(game)?.into_iter().map(|r| r.path).filter(|p| p.is_dir()).collect();
    if mods.is_empty() || roots.is_empty() {
        return Ok(serde_json::json!({"mods": []}));
    }
    let data = kit::run(TOOL, &where_arguments(&found, &roots, &mods))?["data"].clone();
    if let Ok(mut named) = NAMED.lock() {
        named.retain(|(g, ..)| g != game);
        for entry in data["mods"].as_array().map_or(&[][..], Vec::as_slice) {
            if let (Some(repository), Some(whose)) = (entry["repository"].as_str(), entry["whose"].as_str()) {
                named.push((game.to_owned(), repository.to_owned(), whose.to_owned()));
            }
        }
    }
    Ok(data)
}

/// Opens our own repository's new-issue form, filled in with the window's title and text; a text too long for an address comes
/// back to be put on the clipboard. Only for a repository the last answer called ours.
pub fn report_ours(
    data_folder: &Path,
    game: &str,
    repository: &str,
    title: &str,
    body: &str,
) -> Result<Value, Failure> {
    if !named_as(game, repository, "ours") {
        return Err(Failure::refused("only one of your own repositories the Logs page named can be reported to"));
    }
    if title.trim().is_empty() || title.len() > MAX_TITLE || body.len() > MAX_BODY {
        return Err(Failure::refused("a report needs a title of one line and a text of a sane length"));
    }
    let folder = data_folder.join(DRAFTS);
    std::fs::create_dir_all(&folder).map_err(|e| Failure::refused(format!("the report could not be kept: {e}")))?;
    let file = folder.join("report.md");
    std::fs::write(&file, body).map_err(|e| Failure::refused(format!("the report could not be kept: {e}")))?;
    let arguments = Args::new(TOOL, "new")
        .given("--repository", repository)
        .given("--title", &checks::one_line(title))
        .path("--body-file", &file)
        .json();
    let link = kit::run(TOOL, &arguments)?["data"].clone();
    let url = link["url"].as_str().unwrap_or_default();
    if !url.starts_with(&format!("https://github.com/{repository}/issues/new?")) {
        return Err(Failure::refused("the tools gave an address that is not that repository's new-issue form"));
    }
    open(url)?;
    Ok(serde_json::json!({"clipboard": link["clipboard"]}))
}

/// Opens another author's blank new-issue form, for a repository the last answer called theirs.
pub fn their_form(game: &str, repository: &str) -> Result<(), Failure> {
    if !named_as(game, repository, "theirs") {
        return Err(Failure::refused("only an author's repository the Logs page named can be opened"));
    }
    open(&format!("https://github.com/{repository}/issues/new"))
}

/// Opens one issue of a repository the last answer named.
pub fn open_issue(game: &str, repository: &str, number: u64) -> Result<(), Failure> {
    if !either(game, repository) || number == 0 {
        return Err(Failure::refused("only an issue of a repository the Logs page named can be opened"));
    }
    open(&format!("https://github.com/{repository}/issues/{number}"))
}

/// Another author's issues, those naming the fault's words first; only on a press, while Their reports is on.
pub fn their_reports(data_folder: &Path, game: &str, repository: &str, words: &str) -> Result<Value, Failure> {
    if !online::is_on(data_folder, KIND) {
        return Err(Failure::refused("Their reports is switched off in Settings → Going online"));
    }
    if !either(game, repository) {
        return Err(Failure::refused("only a repository the Logs page named can be asked about"));
    }
    kit::reads_online(&kit::read_manifest()?, TOOL, "issues").map_err(Failure::refused)?;
    let arguments = Args::new(TOOL, "issues")
        .given("--repository", repository)
        .given("--words", &checks::one_line(words).chars().take(MAX_NAME).collect::<String>())
        .json();
    Ok(kit::run(TOOL, &arguments)?["data"].clone())
}

#[cfg(test)]
#[path = "tests/report_links.rs"]
mod tests;
