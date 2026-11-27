//! The community lists and your rules, without RimSort (0.112.0; the owner's choice of 28 Nov 2026, "Own data + your rules", the
//! first piece of the mod manager's step 6, retiring RimSort).
//!
//! The kit's `mod-list databases` (1.144.0) says how old each community list the sorter and the check read is, and whose copy is
//! read (the kit's or RimSort's, whichever is newer). With `--fetch` it fetches them from their public GitHub repositories,
//! keyless, only while **Community lists** is on (Going online) and while the manifest calls it `reads-online`: the Mod list fetches
//! the stale ones by itself once a run, and **Fetch them now** is the press. `mod-list rules --import-manager --apply` brings the
//! owner's RimSort rules into their own, on a press, while the manifest calls it `writes`.

use crate::mod_list_page::{ChangeResult, TOOL, named, places, result_of};
use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::games::GamePlaces;
use companion_core::kit::{self, allowed_by_manifest};
use companion_core::online;
use serde_json::Value;
use std::path::Path;

const DATABASES: &str = "databases";
const RULES: &str = "rules";
/// The going-online kind a fetch belongs to.
pub const MOD_DATABASES: &str = "mod-databases";

pub fn databases_arguments(game: &GamePlaces, fetch: bool, stale: bool) -> Vec<String> {
    let mut arguments = named(Args::new(TOOL, DATABASES), game);
    if fetch {
        arguments = arguments.flag("--fetch");
        if stale {
            arguments = arguments.flag("--stale");
        }
    }
    arguments.flag("--no-redact").json()
}

/// The community lists as they stand; with `fetch`, fetched first (only those over a week old with `stale`), only while
/// Community lists is on.
pub fn databases(
    data: &Path,
    game: &str,
    fetch: bool,
    stale: bool,
    listener: Option<kit::Listener>,
) -> Result<Value, Failure> {
    let found = places(game)?;
    if fetch {
        if !online::is_on(data, MOD_DATABASES) {
            return Err(Failure::refused("Community lists is off in Settings, Going online, so nothing was fetched"));
        }
        kit::reads_online(&kit::read_manifest()?, TOOL, DATABASES).map_err(Failure::refused)?;
    }
    Ok(kit::run_hearing(TOOL, &databases_arguments(&found, fetch, stale), listener)?["data"].clone())
}

pub fn import_arguments(game: &GamePlaces) -> Vec<String> {
    named(Args::new(TOOL, RULES), game).flag("--import-manager").flag("--apply").flag("--no-redact").json()
}

/// Brings the owner's rules kept by the mod manager (RimSort) into their own, each one not kept already, on their press.
pub fn import_rules(game: &str) -> Result<ChangeResult, Failure> {
    let found = places(game)?;
    allowed_by_manifest(&kit::read_manifest()?, TOOL, RULES).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &import_arguments(&found), None)?))
}

#[cfg(test)]
#[path = "tests/mod_list_databases.rs"]
mod tests;
