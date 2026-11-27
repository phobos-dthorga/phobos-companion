//! Look up one definition by name (0.106.0; the owner's choice of 27 Nov 2026, "Look up a Def page"), on the Reports page's Look
//! up tab: who defines it and every patch naming it, it as written with its parents, and it with every patch applied.
//!
//! The tools are found by the manifest's `definitions` surface (phobos-modkit 1.140.0: rimworld-defs' `who`, `show` and
//! `patched`), never by name, so another game's look-up can serve the same tab, and a game with none is told so in words. They only
//! read, and run only while the manifest calls them `reads`. The name is checked for the shape a definition's name has and goes
//! after `--`, so it can never be read as an option.

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::kit::{self, Answer, Offered};

const DEFINITIONS: &str = "definitions";
const READS: &str = "reads";
/// The three looks, in the tab's order: who defines and patches it, as written, as patched.
pub const KINDS: [&str; 3] = ["who", "show", "patched"];
/// Longest name accepted.
const MAX_NAME: usize = 120;

/// A definition's name as games write them, with `*` and `?` for a search: letters, digits and `_ . -`, not opening with a dash.
pub fn definition_name(text: &str) -> bool {
    let text = text.trim();
    !text.is_empty()
        && text.len() <= MAX_NAME
        && !text.starts_with('-')
        && text.chars().all(|c| c.is_ascii_alphanumeric() || "_.-*?".contains(c))
        && text.chars().any(|c| c.is_ascii_alphanumeric())
}

/// The arguments for one look: the kind one of `KINDS`, the name checked, after `--`.
pub fn arguments(tool: &str, kind: &str, name: &str) -> Result<Vec<String>, String> {
    if !KINDS.contains(&kind) {
        return Err(format!("{kind:?} is not a way to look a definition up"));
    }
    if !definition_name(name) {
        return Err("that is not a definition's name".to_owned());
    }
    let mut arguments = Args::new(tool, kind).json();
    arguments.extend(["--".to_owned(), name.trim().to_owned()]);
    Ok(arguments)
}

/// Looks one definition up for a game; `available` is false when its tools offer no such look.
pub fn look_up(game: &str, kind: &str, name: &str, listener: Option<kit::Listener>) -> Result<Answer, Failure> {
    let manifest = kit::read_manifest()?;
    let tool = match kit::offered(&manifest, game, DEFINITIONS, kind, READS) {
        Offered::Tool(tool) => tool,
        Offered::Missing => return Ok(Answer::missing()),
        Offered::Changed(reason) => return Err(Failure::refused(reason)),
    };
    let arguments = arguments(&tool, kind, name).map_err(Failure::refused)?;
    Ok(Answer::of(&kit::run_hearing(&tool, &arguments, listener)?))
}

#[cfg(test)]
#[path = "tests/lookup.rs"]
mod tests;
