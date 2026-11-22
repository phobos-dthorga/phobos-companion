//! Home's gate lights (0.61.0; `docs/online.md`, O4): for each of a game's repositories, commits not pushed, files changed, and
//! whether GitHub's checks passed for its last push, from the kit's `repos status`.
//!
//! GitHub is asked only while the person leaves **Gate lights** on in Settings → Going online (on by default, the owner's choice),
//! and only while the kit's manifest still calls the report a reading that goes online. A look Home makes by itself is
//! `--automatic`, so the kit asks GitHub only what may have changed and keeps the last calls of the hour for a press; **Look now**
//! is a press. Switched off, Home still shows what git knows, and says GitHub was not asked.

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit;
use companion_core::online;
use serde_json::Value;
use std::path::{Path, PathBuf};

const TOOL: &str = "repos";
const REPORT: &str = "status";
pub const KIND: &str = "gate-lights";

/// The arguments for one look: every repository at once; online only when allowed; automatic unless pressed.
pub fn arguments(roots: &[PathBuf], online: bool, pressed: bool) -> Vec<String> {
    let mut found = Args::new(TOOL, REPORT).roots(roots.iter().map(PathBuf::as_path));
    if online {
        found = found.flag("--online");
        if !pressed {
            found = found.flag("--automatic");
        }
    }
    found.json()
}

/// One look at a game's repositories. `data` is the program's own folder, where the person's switch is kept.
pub fn read(data: &Path, game: &str, pressed: bool, listener: Option<kit::Listener>) -> Result<Value, Failure> {
    let roots: Vec<PathBuf> =
        games::repositories_of(game)?.into_iter().map(|r| r.path).filter(|p| Path::is_dir(p)).collect();
    let switched_on = online::is_on(data, KIND);
    if roots.is_empty() {
        return Ok(serde_json::json!({"repositories": [], "online": false, "switchedOn": switched_on}));
    }
    if switched_on {
        kit::reads_online(&kit::read_manifest()?, TOOL, REPORT).map_err(Failure::refused)?;
    }
    let mut answer = kit::run_hearing(TOOL, &arguments(&roots, switched_on, pressed), listener)?["data"].clone();
    answer["switchedOn"] = Value::Bool(switched_on);
    Ok(answer)
}

#[cfg(test)]
#[path = "tests/repo_status.rs"]
mod tests;
