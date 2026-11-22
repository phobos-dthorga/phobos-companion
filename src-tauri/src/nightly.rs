//! Home's "Their code changed" (0.63.0; `docs/online.md`, O3): what the nightly watch on GitHub's own machine found in the public
//! source of mods ours patch, read from each of a game's repositories' results branch with the kit's `feeds read --root`.
//!
//! Read only while the person leaves **Nightly watch** on in Settings → Going online (on by default, the owner's choice), and only
//! while the kit's manifest still calls the report a reading that goes online. It reads GitHub's raw files, outside the hourly API
//! count, and the kit keeps each feed's last good copy, which is what Home shows when GitHub can't be reached.

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit;
use companion_core::online;
use serde_json::Value;
use std::path::{Path, PathBuf};

const TOOL: &str = "feeds";
const REPORT: &str = "read";
pub const KIND: &str = "nightly-watch";

/// The arguments for one read: every repository at once, each read for its own results branch.
pub fn arguments(roots: &[PathBuf]) -> Vec<String> {
    Args::new(TOOL, REPORT).roots(roots.iter().map(PathBuf::as_path)).json()
}

/// What the nightly watch found for a game's repositories; nothing is asked while the switch is off.
pub fn read(data: &Path, game: &str, listener: Option<kit::Listener>) -> Result<Value, Failure> {
    if !online::is_on(data, KIND) {
        return Ok(serde_json::json!({"feeds": [], "switchedOn": false}));
    }
    let roots: Vec<PathBuf> =
        games::repositories_of(game)?.into_iter().map(|r| r.path).filter(|p| Path::is_dir(p)).collect();
    if roots.is_empty() {
        return Ok(serde_json::json!({"feeds": [], "switchedOn": true}));
    }
    kit::reads_online(&kit::read_manifest()?, TOOL, REPORT).map_err(Failure::refused)?;
    let mut answer = kit::run_hearing(TOOL, &arguments(&roots), listener)?["data"].clone();
    answer["switchedOn"] = Value::Bool(true);
    Ok(answer)
}

#[cfg(test)]
#[path = "tests/nightly.rs"]
mod tests;
