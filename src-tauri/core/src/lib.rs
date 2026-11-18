//! D'thorga Companion's shared core: everything more than one part of the program uses, and nothing that needs a window.
//!
//! The games on the owner's list (`games`), running the tool kit and reading its answers (`kit`), the failures every part reports
//! (`failure`), checks on what the window asks for (`checks`), the kit's arguments built so the window's text is never read as an
//! option (`args`), reading git (`git`) and starting processes without a console (`process`). The program's Tauri commands and its
//! pages' own modules live in the program; a second front end could use this crate whole (owner, 19 Nov 2026:
//! `docs/shared-code-audit.md`).

pub mod args;
pub mod checks;
pub mod failure;
pub mod games;
pub mod git;
pub mod kit;
pub mod process;

use std::path::PathBuf;

/// The repository this program was built from: where it finds the owner's game list and its pinned tool kit by default.
pub fn repository_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("..")
}
