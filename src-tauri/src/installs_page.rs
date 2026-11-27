//! The Mods page: each repository's mods as installed, in the repository and in their backups, with what moving between them
//! gains or loses; whether a build is needed; and whether any active mod's textures need encoding before the next launch.
//!
//! Reading runs the kit's `installs status` and, for a game whose kit command offers a `textures` surface, its `status`; both only
//! read. The moves are the one place this program changes files outside its own folder (owner, 18 Nov 2026; docs/design-record.md,
//! "The Mods page"): `installs build`, `install`, `backup` and `restore`, and the texture command's `encode`. The host checks every
//! request before the kit sees it: the repository must be one of the game's and opt in with `config/installs.json`; the move must be
//! one this program makes (since 0.21.0 also `dedupe`, which deletes only backups that repeat the one before them), and the kit's
//! manifest must still call it `writes` or `runs`, never `owner-only`; every name is a plain
//! folder name or package ID. The kit then checks again (a known mod, a real backup, the game closed) and refuses in words.

use companion_core::args::Args;
use companion_core::checks::plain_name;
use companion_core::failure::Failure;
use companion_core::games::{self, Repository};
use companion_core::kit::{self, Outcome, allowed_by_manifest};
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const TOOL: &str = "installs";
const STATUS: &str = "status";
const ENCODE: &str = "encode";
const TEXTURES_SURFACE: &str = "textures";
const PAIRS: &str = "pairs";
const PAIRS_SURFACE: &str = "texture-pairs";
const CONFIG: [&str; 2] = ["config", "installs.json"];
const MOVES: [&str; 5] = ["build", "install", "backup", "restore", "dedupe"];
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
    Ok(games::repositories_of(game)?.into_iter().filter(|r| opts_in(&r.path)).collect())
}

fn opts_in(path: &Path) -> bool {
    config_path(path).is_file()
}

fn config_path(path: &Path) -> PathBuf {
    path.join(CONFIG[0]).join(CONFIG[1])
}

/// Every repository of a game that opts in, read through the kit.
pub fn read(game: &str, listener: Option<kit::Listener>) -> Result<Vec<RepositoryInstalls>, Failure> {
    let mut found = Vec::new();
    let mut looked = Vec::new();
    for repository in with_installs(game)? {
        let answer = kit::run_hearing(TOOL, &status_arguments(&repository.path), listener)?;
        Outcome::required(&answer)?;
        crate::viewable::remember(crate::viewable::in_installs(&answer["data"]));
        looked.push((repository.path.clone(), installed_folders(&answer["data"])));
        found.push(RepositoryInstalls {
            status: answer["data"].clone(),
            command_line: format!("python scripts/installs.py status   (in {})", repository.name),
            repository: repository.name,
        });
    }
    LOOKED_AT.lock().unwrap_or_else(std::sync::PoisonError::into_inner).insert(game.to_owned(), looked);
    Ok(found)
}

// ---------------------------------------------------------------- a quick look on coming back (0.116.0)

/// What the last read of each game named, for this run only: each repository's folder, and its install folder and the folders
/// its mods are installed in.
static LOOKED_AT: Mutex<BTreeMap<String, Vec<Looked>>> = Mutex::new(BTreeMap::new());

/// One repository's folder, with the install folder and the installed mods' folders its last read named.
type Looked = (PathBuf, Vec<PathBuf>);

/// The install folder and every installed mod's folder an `installs status` answer names.
pub fn installed_folders(data: &Value) -> Vec<PathBuf> {
    let mods = data["mods"].as_array().map_or(&[][..], Vec::as_slice);
    data["target"]
        .as_str()
        .into_iter()
        .chain(mods.iter().filter_map(|m| m["installed"]["folder"].as_str()))
        .map(PathBuf::from)
        .collect()
}

/// A fingerprint of what the Mods page reads, taken without the kit (the owner's choice of 28 Nov 2026, "Only if something
/// changed", for coming back to the window): each repository's last commit and changed files, and each folder the last read named
/// (the install folder's entries; each mod folder's files, how many and the newest time). None before a first read this run, so
/// the window reads. It cannot see the game start or stop: the kit says so at the next read, and refuses a move while it runs.
pub fn glance(game: &str) -> Option<String> {
    let looked = LOOKED_AT.lock().unwrap_or_else(std::sync::PoisonError::into_inner).get(game).cloned()?;
    let mut hasher = DefaultHasher::new();
    for (repository, folders) in looked {
        companion_core::git::text(&repository, &["rev-parse", "HEAD"]).hash(&mut hasher);
        companion_core::git::text(&repository, &["status", "--porcelain"]).hash(&mut hasher);
        for (place, folder) in folders.iter().enumerate() {
            if place == 0 {
                let mut names: Vec<_> =
                    fs::read_dir(folder).into_iter().flatten().filter_map(Result::ok).map(|e| e.file_name()).collect();
                names.sort();
                names.hash(&mut hasher);
            } else {
                files_of(folder).hash(&mut hasher);
            }
        }
    }
    Some(format!("{:016x}", hasher.finish()))
}

/// How many files a folder holds, all the way down, and the newest one's time.
fn files_of(folder: &Path) -> (usize, Option<std::time::SystemTime>) {
    let (mut count, mut newest) = (0, None);
    let mut folders = vec![folder.to_path_buf()];
    while let Some(next) = folders.pop() {
        for entry in fs::read_dir(&next).into_iter().flatten().filter_map(Result::ok) {
            match entry.file_type() {
                Ok(kind) if kind.is_dir() => folders.push(entry.path()),
                Ok(_) => {
                    count += 1;
                    let time = entry.metadata().and_then(|m| m.modified()).ok();
                    newest = newest.max(time);
                }
                Err(_) => {}
            }
        }
    }
    (count, newest)
}

/// Unredacted (0.53.0): each copy's folder is where the window's pictures and sounds are read from.
fn status_arguments(root: &Path) -> Vec<String> {
    Args::new(TOOL, STATUS).root(root).flag("--no-redact").json()
}

/// Makes one move the owner asked for, after the checks above. `mods` names the mods (none for a build, one for a backup or going
/// back, one or more for an install).
pub fn make_move(
    game: &str,
    repository: &str,
    action: &str,
    mods: &[String],
    backup: Option<&str>,
    listener: Option<kit::Listener>,
) -> Result<MoveResult, Failure> {
    let found = with_installs(game)?
        .into_iter()
        .find(|r| r.name == repository)
        .ok_or_else(|| Failure::refused(format!("{repository} does not say where its mods are installed")))?;
    if !MOVES.contains(&action) {
        return Err(Failure::refused(format!("{action:?} is not a move this program makes")));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, action).map_err(Failure::refused)?;
    let arguments = move_arguments(&found.path, action, mods, backup).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &arguments, listener)?))
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
        arguments.extend(Args::default().pair("--mod", name).done());
    }
    Ok(arguments)
}

pub fn move_arguments(root: &Path, action: &str, mods: &[String], backup: Option<&str>) -> Result<Vec<String>, String> {
    let arguments = Args::new(TOOL, action).root(root);
    let arguments = match (action, mods.len(), backup) {
        ("build", 0, None) => arguments,
        ("build", _, _) => return Err("a build names no mod".to_owned()),
        ("install", n, None) if n > 0 => arguments.extend(mod_arguments(mods)?),
        ("backup", 1, None) => arguments.extend(mod_arguments(mods)?),
        ("restore", 1, Some(name)) if plain_name(name) => arguments.extend(mod_arguments(mods)?).pair("--backup", name),
        ("restore", 1, _) => return Err("going back needs one of the mod's backups".to_owned()),
        ("dedupe", 0, None) => arguments,
        ("dedupe", 1, None) => arguments.extend(mod_arguments(mods)?),
        _ => return Err(format!("{action} was asked with the wrong mods or backup")),
    };
    Ok(arguments.json())
}

fn result_of(answer: &Value) -> MoveResult {
    let outcome = Outcome::of(answer);
    MoveResult {
        ok: outcome.ok,
        title: answer["report"]["title"].as_str().unwrap_or_default().to_owned(),
        refusal: outcome.refusal,
        data: answer["data"].clone(),
    }
}

// ---------------------------------------------------------------- textures

/// The kit command that checks this game's textures: the one whose game is this game and whose status report has the textures
/// surface. The core never names a game; the manifest does.
pub fn textures_command(manifest: &Value, game: &str) -> Option<String> {
    reading_command(manifest, game, STATUS, TEXTURES_SURFACE)
}

/// The kit command of this game whose report `report` reads and carries `surface`.
fn reading_command(manifest: &Value, game: &str, report: &str, surface: &str) -> Option<String> {
    let commands = manifest["data"]["commands"].as_array()?;
    commands
        .iter()
        .filter(|c| c["game"].as_str() == Some(game))
        .find(|c| {
            c["reports"].as_array().is_some_and(|reports| {
                reports.iter().any(|r| {
                    r["name"].as_str() == Some(report)
                        && r["surface"].as_str() == Some(surface)
                        && r["effect"].as_str() == Some("reads")
                })
            })
        })
        .and_then(|c| c["name"].as_str().map(str::to_owned))
}

/// Whether this game's tools pair each picture with its encoded texture (0.53.0): the Mods page offers the comparison only then.
pub fn has_texture_pairs(game: &str) -> Result<bool, Failure> {
    Ok(reading_command(&kit::read_manifest()?, game, PAIRS, PAIRS_SURFACE).is_some())
}

/// One active mod's pictures, each beside the encoded texture the game loads in its place (0.53.0; the owner's choice of 23 Nov
/// 2026, the encoded texture check). Only reads; every picture and texture it names may then be shown.
pub fn texture_pairs(game: &str, name: &str, listener: Option<kit::Listener>) -> Result<Value, Failure> {
    if !plain_name(name) {
        return Err(Failure::refused(format!("{name:?} is not a mod's folder name or package ID")));
    }
    let manifest = kit::read_manifest()?;
    let Some(command) = reading_command(&manifest, game, PAIRS, PAIRS_SURFACE) else {
        return Err(Failure::refused("this game's tools do not pair pictures with encoded textures"));
    };
    let mut arguments = vec![command.clone(), PAIRS.to_owned(), format!("--mod={name}"), "--no-redact".to_owned()];
    arguments = with_settings(arguments, settings_file(game)?);
    let answer = kit::run_hearing(&command, &arguments, listener)?;
    Outcome::required(&answer)?;
    crate::viewable::remember(crate::viewable::in_pairs(&answer["data"]));
    Ok(answer["data"].clone())
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
pub fn read_textures(game: &str, listener: Option<kit::Listener>) -> Result<Option<Value>, Failure> {
    let manifest = kit::read_manifest()?;
    let Some(command) = textures_command(&manifest, game) else {
        return Ok(None);
    };
    let arguments = with_settings(vec![command.clone(), STATUS.to_owned()], settings_file(game)?);
    let answer = kit::run_hearing(&command, &arguments, listener)?;
    Outcome::required(&answer)?;
    Ok(Some(answer["data"].clone()))
}

/// Encodes the named mods' textures, after the same kind of checks as the moves.
pub fn encode_textures(game: &str, mods: &[String], listener: Option<kit::Listener>) -> Result<MoveResult, Failure> {
    let manifest = kit::read_manifest()?;
    let command =
        textures_command(&manifest, game).ok_or_else(|| Failure::refused(format!("{game} has no texture check")))?;
    allowed_by_manifest(&manifest, &command, ENCODE).map_err(Failure::refused)?;
    if mods.is_empty() {
        return Err(Failure::refused("name at least one mod"));
    }
    let mut arguments = vec![command.clone(), ENCODE.to_owned()];
    arguments.extend(mod_arguments(mods).map_err(Failure::refused)?);
    Ok(result_of(&kit::run_hearing(&command, &with_settings(arguments, settings_file(game)?), listener)?))
}

#[cfg(test)]
#[path = "tests/installs_page.rs"]
mod tests;
