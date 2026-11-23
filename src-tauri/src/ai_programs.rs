//! Settings → AI, AI programs (0.70.0; `docs/ai.md`, A1, the owner's choice of 23 Nov 2026): the lines an AI program needs to start
//! the kit's MCP server, from the kit's `mcp setup`. It only reads. The lines are shown in full (`--no-redact`), since lines with
//! `~` in them would start nothing, and they are only shown to the person, never given to a model. The server itself is started by
//! the AI program the person sets up, never by this program, and it runs only the kit's reports that read.

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::kit;
use serde_json::Value;

const TOOL: &str = "mcp";
const SETUP: &str = "setup";

/// The kit's arguments for the setup lines, with this computer's own paths.
pub fn setup_arguments() -> Vec<String> {
    Args::new(TOOL, SETUP).flag("--no-redact").json()
}

/// The setup lines: the server's name, command, arguments and environment, the server list for most programs, and Claude Code's
/// command.
pub fn read() -> Result<Value, Failure> {
    Ok(kit::run(TOOL, &setup_arguments())?["data"].clone())
}

#[cfg(test)]
#[path = "tests/ai_programs.rs"]
mod tests;
