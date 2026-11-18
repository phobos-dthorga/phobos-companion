//! The Mods page: each repository's mods as installed, in the repository and in their backups, with what moving between them
//! gains or loses by their changelogs; and the three moves, made only when the owner presses a button and confirms.
//!
//! Reading runs the kit's `installs status`, which only reads. The moves (`backup`, `restore`, `install`) are the one place this
//! program changes a game's files, owner's request, 18 Nov 2026 (docs/design-record.md, "The Mods page"). The host checks every
//! request here before the kit sees it: the repository must be one of the game's and opt in with `config/installs.json`; the move
//! must be one of the three, and the kit's manifest must still call it `writes` or `runs`, never `owner-only`; mod and backup names
//! are plain folder names. The kit then checks again (a known mod, a real backup, the game closed) and refuses in words.

use crate::failure::{Failure, FailureCode};
use crate::games::{self, Repository};
use crate::kit;
use serde::Serialize;
use serde_json::Value;
use std::path::Path;

const TOOL: &str = "installs";
const STATUS: &str = "status";
const CONFIG: [&str; 2] = ["config", "installs.json"];
const MOVES: [&str; 3] = ["backup", "restore", "install"];
const ALLOWED_EFFECTS: [&str; 2] = ["writes", "runs"];
const MAX_NAME: usize = 120;

/// One repository's mods, as the kit reads them.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct RepositoryInstalls {
    pub repository: String,
    /// The kit's `data`: the mods, backups, free space and whether the game is running.
    pub status: Value,
    pub command_line: String,
}

/// What a move did, or why the kit refused it.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct MoveResult {
    pub ok: bool,
    pub title: String,
    pub refusal: Option<String>,
    pub data: Value,
}

/// The repositories of one game that say where their mods are installed.
fn with_installs(game: &str) -> Result<Vec<Repository>, Failure> {
    let listed = games::load()?.unwrap_or_default();
    let found = listed.into_iter().find(|g| g.id == game);
    Ok(found.map(|g| g.repositories.into_iter().filter(|r| opts_in(&r.path)).collect()).unwrap_or_default())
}

fn opts_in(path: &Path) -> bool {
    path.join(CONFIG[0]).join(CONFIG[1]).is_file()
}

/// Every repository of a game that opts in, read through the kit.
pub fn read(game: &str) -> Result<Vec<RepositoryInstalls>, Failure> {
    let mut found = Vec::new();
    for repository in with_installs(game)? {
        let arguments = status_arguments(&repository.path);
        let answer = kit::run(TOOL, &arguments)?;
        if answer["data"]["ok"] == Value::Bool(false) {
            return Err(Failure::new(
                FailureCode::ToolFailed,
                answer["data"]["refusal"].as_str().unwrap_or_default().to_owned(),
            ));
        }
        found.push(RepositoryInstalls {
            status: answer["data"].clone(),
            command_line: format!("python scripts/installs.py status   (in {})", repository.name),
            repository: repository.name,
        });
    }
    Ok(found)
}

fn status_arguments(root: &Path) -> Vec<String> {
    vec![TOOL.to_owned(), STATUS.to_owned(), "--root".to_owned(), root.display().to_string(), "--json".to_owned()]
}

/// Makes one move the owner confirmed, after the checks above.
pub fn make_move(
    game: &str,
    repository: &str,
    action: &str,
    mod_name: &str,
    backup: Option<&str>,
) -> Result<MoveResult, Failure> {
    let refused = |detail: String| Failure::new(FailureCode::Refused, detail);
    let found = with_installs(game)?
        .into_iter()
        .find(|r| r.name == repository)
        .ok_or_else(|| refused(format!("{repository} does not say where its mods are installed")))?;
    allowed_by_manifest(&kit::read_manifest()?, action).map_err(refused)?;
    let arguments = move_arguments(&found.path, action, mod_name, backup).map_err(refused)?;
    let answer = kit::run(TOOL, &arguments)?;
    Ok(result_of(&answer))
}

/// The move is one of the three, and the kit's manifest still says it writes or runs (never owner-only).
pub fn allowed_by_manifest(manifest: &Value, action: &str) -> Result<(), String> {
    if !MOVES.contains(&action) {
        return Err(format!("{action:?} is not a move this program makes"));
    }
    let commands = manifest["data"]["commands"].as_array().map_or(&[][..], Vec::as_slice);
    let report = commands
        .iter()
        .find(|c| c["name"].as_str() == Some(TOOL))
        .and_then(|c| c["reports"].as_array())
        .and_then(|reports| reports.iter().find(|r| r["name"].as_str() == Some(action)))
        .ok_or_else(|| format!("the tool kit has no {TOOL} {action}"))?;
    let effect = report["effect"].as_str().unwrap_or_default();
    if ALLOWED_EFFECTS.contains(&effect) {
        Ok(())
    } else {
        Err(format!("the tool kit says {TOOL} {action} is {effect:?}, which this program does not run"))
    }
}

/// A mod's or a backup's folder name: letters, digits, dots, dashes and underscores, never starting with a dash or a dot.
pub fn plain_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= MAX_NAME
        && !name.starts_with(['-', '.'])
        && name.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
}

pub fn move_arguments(root: &Path, action: &str, mod_name: &str, backup: Option<&str>) -> Result<Vec<String>, String> {
    if !plain_name(mod_name) {
        return Err(format!("{mod_name:?} is not a mod's folder name"));
    }
    let mut arguments = vec![
        TOOL.to_owned(),
        action.to_owned(),
        "--root".to_owned(),
        root.display().to_string(),
        "--mod".to_owned(),
        mod_name.to_owned(),
    ];
    match (action, backup) {
        ("restore", Some(name)) if plain_name(name) => arguments.extend(["--backup".to_owned(), name.to_owned()]),
        ("restore", _) => return Err("going back needs one of the mod's backups".to_owned()),
        (_, Some(_)) => return Err(format!("{action} takes no backup")),
        (_, None) => {}
    }
    arguments.push("--json".to_owned());
    Ok(arguments)
}

fn result_of(answer: &Value) -> MoveResult {
    let data = &answer["data"];
    MoveResult {
        ok: data["ok"].as_bool().unwrap_or(false),
        title: answer["report"]["title"].as_str().unwrap_or_default().to_owned(),
        refusal: data["refusal"].as_str().map(str::to_owned),
        data: data.clone(),
    }
}

#[cfg(test)]
#[path = "tests/installs_page.rs"]
mod tests;
