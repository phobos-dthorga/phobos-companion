//! Which version of the tool kit each of a game's repositories pins, and what moving its pin would bring (cross-links S2): the
//! kit's `pins status`, which only reads. Repositories that do not pin the kit are left out by the kit itself.

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit;
use serde_json::Value;
use std::path::{Path, PathBuf};

const TOOL: &str = "pins";

/// The arguments that ask about every repository at once.
pub fn arguments(roots: &[PathBuf]) -> Vec<String> {
    Args::new(TOOL, "status").roots(roots.iter().map(PathBuf::as_path)).json()
}

/// Each of a game's repositories that pins the kit: its version, how far behind, and what a move would bring.
pub fn read(game: &str) -> Result<Value, Failure> {
    let roots: Vec<PathBuf> =
        games::repositories_of(game)?.into_iter().map(|r| r.path).filter(|p| Path::is_dir(p)).collect();
    if roots.is_empty() {
        return Ok(serde_json::json!({"kit": null, "pins": []}));
    }
    let answer = kit::run(TOOL, &arguments(&roots))?;
    Ok(answer["data"].clone())
}

#[cfg(test)]
#[path = "tests/kit_pins.rs"]
mod tests;
