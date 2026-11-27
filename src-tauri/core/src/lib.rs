//! D'thorga Companion's shared core: everything more than one part of the program uses, and nothing that needs a window.
//!
//! The games on the owner's list (`games`), running the tool kit and reading its answers (`kit`), the failures every part reports
//! (`failure`), checks on what the window asks for (`checks`), the kit's arguments built so the window's text is never read as an
//! option (`args`), reading git (`git`), when features for agent sessions show (`agents`), which kinds of online call the program
//! may make by itself (`online`), starting processes without a console (`process`), a kit command that stays
//! running and answers requests (`serve`) and times as the kit reads them (`time`), and AI services for help on pages (`ai`, its
//! requests `ai_client` and its keys `ai_keys`, 0.71.0; programs the person logs in to, `ai_programs`, 0.115.0). The program's Tauri commands and its pages' own modules live in the
//! program; a second front end could use this crate whole (owner, 19 Nov 2026: `docs/history/shared-code-audit.md`).

pub mod acp;
pub mod activity;
pub mod agents;
pub mod ai;
pub mod ai_client;
pub mod ai_keys;
pub mod ai_programs;
pub mod args;
pub mod checks;
pub mod code_colours;
pub mod commands;
pub mod failure;
pub mod games;
pub mod git;
pub mod kit;
pub mod online;
pub mod prefs;
pub mod process;
pub mod serve;
pub mod setup;
pub mod starters;
pub mod terminals;
pub mod themes;
pub mod time;

use std::path::{Path, PathBuf};
use std::sync::OnceLock;

/// The repository this program was built from: where it finds the owner's game list and its pinned tool kit by default.
pub fn repository_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("..")
}

/// What the installer brought (0.35.0; the release audit's A1 to A3): the runtime beside the program (a portable Python and the
/// tool kit) and this person's own data folder. Set once, when the program starts.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Installed {
    pub runtime: PathBuf,
    pub data: PathBuf,
}

static INSTALLED: OnceLock<Installed> = OnceLock::new();

pub fn set_installed(runtime: PathBuf, data: PathBuf) {
    let _ = INSTALLED.set(Installed { runtime, data });
}

pub fn installed() -> Option<&'static Installed> {
    INSTALLED.get()
}

/// Set to 1, the program behaves as on a stranger's PC even beside the repository it was built from: to try an install.
pub const BUNDLED_VARIABLE: &str = "PHOBOS_COMPANION_BUNDLED";

/// Whether the program runs beside the repository it was built from, with its tool kit there (a developer's PC, the owner's):
/// then it reads the kit and the games list from that repository, as it always has.
pub fn from_build_folder() -> bool {
    std::env::var(BUNDLED_VARIABLE).map_or(true, |value| value != "1") && kit_in(&repository_root())
}

/// Whether a repository holds the tool kit where this program's build looks for it.
pub fn kit_in(root: &Path) -> bool {
    root.join("external").join("phobos-modkit").join("python").join("phobos_modkit").is_dir()
}
