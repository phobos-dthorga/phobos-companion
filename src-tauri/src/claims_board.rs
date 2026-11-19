//! Who is working on what (the owner's go-ahead, 19 Nov 2026; `docs/later.md`, item 3): the kit's `claims list`, the board where
//! agent sessions sharing the machine hold version numbers, test rows and files. The Companion only reads it; sessions take and
//! release claims with the kit themselves (phobos-modkit's `rules/every-session.md`).

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::kit;
use serde_json::Value;

const TOOL: &str = "claims";
const LIST: &str = "list";

pub fn arguments() -> Vec<String> {
    Args::new(TOOL, LIST).json()
}

/// The board: every claim, oldest first, with its age and whether it is old.
pub fn read() -> Result<Value, Failure> {
    Ok(kit::run(TOOL, &arguments())?["data"].clone())
}

#[cfg(test)]
#[path = "tests/claims_board.rs"]
mod tests;
