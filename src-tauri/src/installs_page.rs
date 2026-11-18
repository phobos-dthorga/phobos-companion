//! The Mods page: each repository's mods as installed, in the repository and in their backups, with what moving between them
//! gains or loses; whether a build is needed; and whether any active mod's textures need encoding before the next launch.
//!
//! Reading runs the kit's `installs status` and, for a game whose kit command offers a `textures` surface, its `status`; both only
//! read. The moves are the one place this program changes files outside its own folder (owner, 18 Nov 2026; docs/design-record.md,
//! "The Mods page"): `installs build`, `install`, `backup` and `restore`, and the texture command's `encode`. The host checks every
//! request before the kit sees it: the repository must be one of the game's and opt in with `config/installs.json`; the move must be
//! one this program makes, and the kit's manifest must still call it `writes` or `runs`, never `owner-only`; every name is a plain
//! folder name or package ID. The kit then checks again (a known mod, a real backup, the game closed) and refuses in words.

use crate::failure::{Failure, FailureCode};
use crate::games::{self, Repository};
use crate::kit;
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

const TOOL: &str = "installs";
const STATUS: &str = "status";
const ENCODE: &str = "encode";
const TEXTURES_SURFACE: &str = "textures";
const CONFIG: [&str; 2] = ["config", "installs.json"];
const MOVES: [&str; 4] = ["build", "install", "backup", "restore"];
const ALLOWED_EFFECTS: [&str; 2] = ["writes", "runs"];
const MAX_NAME: usize = 120;
const MAX_MODS: usize = 400;

/// One repository's mods, as the kit reads them.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct RepositoryInstalls {
    pub repository: String,
    /// The kit's `data`: the mods, backups, builds, free space and whether the game is running.
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
    config_path(path).is_file()
}

fn config_path(path: &Path) -> PathBuf {
    path.join(CONFIG[0]).join(CONFIG[1])
}

/// Every repository of a game that opts in, read through the kit.
pub fn read(game: &str) -> Result<Vec<RepositoryInstalls>, Failure> {
    let mut found = Vec::new();
    for repository in with_installs(game)? {
        let answer = kit::run(TOOL, &status_arguments(&repository.path))?;
        refusal_as_failure(&answer)?;
        found.push(RepositoryInstalls {
            status: answer["data"].clone(),
            command_line: format!("python scripts/installs.py status   (in {})", repository.name),
            repository: repository.name,
        });
    }
    Ok(found)
}

fn refusal_as_failure(answer: &Value) -> Result<(), Failure> {
    if answer["data"]["ok"] == Value::Bool(false) {
        return Err(Failure::new(
            FailureCode::ToolFailed,
            answer["data"]["refusal"].as_str().unwrap_or_default().to_owned(),
        ));
    }
    Ok(())
}

fn status_arguments(root: &Path) -> Vec<String> {
    vec![TOOL.to_owned(), STATUS.to_owned(), "--root".to_owned(), root.display().to_string(), "--json".to_owned()]
}

/// Makes one move the owner asked for, after the checks above. `mods` names the mods (none for a build, one for a backup or going
/// back, one or more for an install).
pub fn make_move(
    game: &str,
    repository: &str,
    action: &str,
    mods: &[String],
    backup: Option<&str>,
) -> Result<MoveResult, Failure> {
    let refused = |detail: String| Failure::new(FailureCode::Refused, detail);
    let found = with_installs(game)?
        .into_iter()
        .find(|r| r.name == repository)
        .ok_or_else(|| refused(format!("{repository} does not say where its mods are installed")))?;
    if !MOVES.contains(&action) {
        return Err(refused(format!("{action:?} is not a move this program makes")));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, action).map_err(refused)?;
    let arguments = move_arguments(&found.path, action, mods, backup).map_err(refused)?;
    Ok(result_of(&kit::run(TOOL, &arguments)?))
}

/// The kit's manifest still says this report writes or runs (never owner-only, never one it does not have).
pub fn allowed_by_manifest(manifest: &Value, command: &str, report: &str) -> Result<(), String> {
    let commands = manifest["data"]["commands"].as_array().map_or(&[][..], Vec::as_slice);
    let found = commands
        .iter()
        .find(|c| c["name"].as_str() == Some(command))
        .and_then(|c| c["reports"].as_array())
        .and_then(|reports| reports.iter().find(|r| r["name"].as_str() == Some(report)))
        .ok_or_else(|| format!("the tool kit has no {command} {report}"))?;
    let effect = found["effect"].as_str().unwrap_or_default();
    if ALLOWED_EFFECTS.contains(&effect) {
        Ok(())
    } else {
        Err(format!("the tool kit says {command} {report} is {effect:?}, which this program does not run"))
    }
}

/// A mod's folder name, a backup's or a package ID: letters, digits, dots, dashes and underscores, never starting with either.
pub fn plain_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= MAX_NAME
        && !name.starts_with(['-', '.'])
        && name.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
}

fn mod_arguments(mods: &[String]) -> Result<Vec<String>, String> {
    if mods.len() > MAX_MODS {
        return Err(format!("more than {MAX_MODS} mods at once"));
    }
    let mut arguments = Vec::new();
    for name in mods {
        if !plain_name(name) {
            return Err(format!("{name:?} is not a mod's folder name"));
        }
        arguments.extend(["--mod".to_owned(), name.clone()]);
    }
    Ok(arguments)
}

pub fn move_arguments(root: &Path, action: &str, mods: &[String], backup: Option<&str>) -> Result<Vec<String>, String> {
    let mut arguments = vec![TOOL.to_owned(), action.to_owned(), "--root".to_owned(), root.display().to_string()];
    match (action, mods.len(), backup) {
        ("build", 0, None) => {}
        ("build", _, _) => return Err("a build names no mod".to_owned()),
        ("install", n, None) if n > 0 => arguments.extend(mod_arguments(mods)?),
        ("backup", 1, None) => arguments.extend(mod_arguments(mods)?),
        ("restore", 1, Some(name)) if plain_name(name) => {
            arguments.extend(mod_arguments(mods)?);
            arguments.extend(["--backup".to_owned(), name.to_owned()]);
        }
        ("restore", 1, _) => return Err("going back needs one of the mod's backups".to_owned()),
        _ => return Err(format!("{action} was asked with the wrong mods or backup")),
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

// ---------------------------------------------------------------- textures

/// The kit command that checks this game's textures: the one whose game is this game and whose status report has the textures
/// surface. The core never names a game; the manifest does.
pub fn textures_command(manifest: &Value, game: &str) -> Option<String> {
    let commands = manifest["data"]["commands"].as_array()?;
    commands
        .iter()
        .filter(|c| c["game"].as_str() == Some(game))
        .find(|c| {
            c["reports"].as_array().is_some_and(|reports| {
                reports.iter().any(|r| {
                    r["name"].as_str() == Some(STATUS)
                        && r["surface"].as_str() == Some(TEXTURES_SURFACE)
                        && r["effect"].as_str() == Some("reads")
                })
            })
        })
        .and_then(|c| c["name"].as_str().map(str::to_owned))
}

/// A settings file one of the game's opted-in repositories names, for the game's paths; none when no repository names one.
fn settings_file(game: &str) -> Result<Option<PathBuf>, Failure> {
    for repository in with_installs(game)? {
        let text = fs::read_to_string(config_path(&repository.path)).unwrap_or_default();
        let named = serde_json::from_str::<Value>(&text).ok().and_then(|v| v["settings"].as_str().map(str::to_owned));
        if let Some(named) = named {
            let path = repository.path.join(named);
            if path.is_file() {
                return Ok(Some(path));
            }
        }
    }
    Ok(None)
}

fn with_settings(mut arguments: Vec<String>, settings: Option<PathBuf>) -> Vec<String> {
    if let Some(path) = settings {
        arguments.extend(["--settings".to_owned(), path.display().to_string()]);
    }
    arguments.push("--json".to_owned());
    arguments
}

/// Whether any active mod's textures need encoding; None when the game has no texture check.
pub fn read_textures(game: &str) -> Result<Option<Value>, Failure> {
    let manifest = kit::read_manifest()?;
    let Some(command) = textures_command(&manifest, game) else {
        return Ok(None);
    };
    let arguments = with_settings(vec![command.clone(), STATUS.to_owned()], settings_file(game)?);
    let answer = kit::run(&command, &arguments)?;
    refusal_as_failure(&answer)?;
    Ok(Some(answer["data"].clone()))
}

/// Encodes the named mods' textures, after the same kind of checks as the moves.
pub fn encode_textures(game: &str, mods: &[String]) -> Result<MoveResult, Failure> {
    let refused = |detail: String| Failure::new(FailureCode::Refused, detail);
    let manifest = kit::read_manifest()?;
    let command = textures_command(&manifest, game).ok_or_else(|| refused(format!("{game} has no texture check")))?;
    allowed_by_manifest(&manifest, &command, ENCODE).map_err(refused)?;
    if mods.is_empty() {
        return Err(refused("name at least one mod".to_owned()));
    }
    let mut arguments = vec![command.clone(), ENCODE.to_owned()];
    arguments.extend(mod_arguments(mods).map_err(refused)?);
    Ok(result_of(&kit::run(&command, &with_settings(arguments, settings_file(game)?))?))
}

#[cfg(test)]
#[path = "tests/installs_page.rs"]
mod tests;
