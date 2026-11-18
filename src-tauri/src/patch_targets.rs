//! The methods a repository's code patches, with every other mod patching the same method and what the last update changed in it:
//! badges on the Code map (cross-links L5). The tool is whichever report the manifest marks as the game's patch-targets reader
//! (surface `patch-targets`, kit 1.37.1); the host names no game, and a game whose tools have none is told so.

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit;
use serde::Serialize;
use serde_json::Value;
use std::path::Path;

const SURFACE: &str = "patch-targets";
const READS: &str = "reads";
const NEEDED: [&str; 3] = ["--root", "--updates", "--json"];

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct PatchTargets {
    /// False when this game's tools have no patch-targets reader.
    pub available: bool,
    pub data: Value,
}

/// The arguments that read a repository's patch targets with the last update compared; None when the game has no reader.
pub fn plan(manifest: &Value, game: &str, root: &Path) -> Option<Vec<String>> {
    let commands = manifest["data"]["commands"].as_array()?;
    for command in commands.iter().filter(|c| c["game"].as_str() == Some(game)) {
        for report in command["reports"].as_array().map_or(&[][..], Vec::as_slice) {
            if report["surface"].as_str() != Some(SURFACE) || report["effect"].as_str() != Some(READS) {
                continue;
            }
            let options = report["options"].as_array().map_or(&[][..], Vec::as_slice);
            let has = |name: &str| options.iter().any(|o| o["name"].as_str() == Some(name));
            if !NEEDED.iter().all(|name| has(name)) {
                continue;
            }
            let name = command["name"].as_str()?;
            let report_name = report["name"].as_str()?;
            return Some(Args::new(name, report_name).root(root).flag("--updates").json());
        }
    }
    None
}

/// Reads one repository's patch targets through its game's tools, or says the game has no reader.
pub fn read(game: &str, repository: &str, listener: Option<kit::Listener>) -> Result<PatchTargets, Failure> {
    let found = games::named_repository(game, repository)?;
    let manifest = kit::read_manifest()?;
    let Some(arguments) = plan(&manifest, game, &found.path) else {
        return Ok(PatchTargets { available: false, data: Value::Null });
    };
    let command = arguments[0].clone();
    let answer = kit::run_hearing(&command, &arguments, listener)?;
    Ok(PatchTargets { available: true, data: answer["data"].clone() })
}

#[cfg(test)]
#[path = "tests/patch_targets.rs"]
mod tests;
