//! What each repository's changelogs have not released yet, for the Home page: entries with no version yet, and versions still in
//! draft. The tool kit reads the changelogs (`changes pending`, kit 1.32.0) for every repository in one run, with no git, so the
//! Home page and every other page read a changelog the same way (docs/history/shared-code-audit.md, X1).

use companion_core::args::Args;
use companion_core::games::Repository;
use companion_core::kit;
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;

const TOOL: &str = "changes";
const PENDING: &str = "pending";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct PendingRelease {
    pub product: String,
    pub repository: String,
    pub unreleased: usize,
    pub draft_version: Option<String>,
    pub draft_date: Option<String>,
    pub earlier_drafts: usize,
}

pub fn arguments(repositories: &[&Repository]) -> Vec<String> {
    Args::new(TOOL, PENDING).roots(repositories.iter().map(|r| r.path.as_path())).json()
}

/// What each repository has not released, by its folder. When the tools cannot be run, nothing is pending as far as the Home page
/// knows; the tools' own panel says why.
pub fn read_all(repositories: &[&Repository]) -> HashMap<PathBuf, Vec<PendingRelease>> {
    let there: Vec<&Repository> = repositories.iter().copied().filter(|r| r.path.is_dir()).collect();
    if there.is_empty() {
        return HashMap::new();
    }
    kit::run(TOOL, &arguments(&there)).map(|answer| pending_of(&answer, &there)).unwrap_or_default()
}

/// The kit's answer, matched to the repositories it was asked about, in the order they were named.
pub fn pending_of(answer: &Value, repositories: &[&Repository]) -> HashMap<PathBuf, Vec<PendingRelease>> {
    let listed = answer["data"]["repositories"].as_array().map_or(&[][..], Vec::as_slice);
    repositories
        .iter()
        .zip(listed)
        .map(|(repository, found)| {
            let releases = found["pending"]
                .as_array()
                .map_or(&[][..], Vec::as_slice)
                .iter()
                .map(|p| PendingRelease {
                    product: p["product"].as_str().unwrap_or(&repository.name).to_owned(),
                    repository: repository.name.clone(),
                    unreleased: p["unreleased"].as_u64().unwrap_or(0) as usize,
                    draft_version: p["draftVersion"].as_str().map(str::to_owned),
                    draft_date: p["draftDate"].as_str().map(str::to_owned),
                    earlier_drafts: p["earlierDrafts"].as_u64().unwrap_or(0) as usize,
                })
                .collect();
            (repository.path.clone(), releases)
        })
        .collect()
}

#[cfg(test)]
#[path = "tests/pending.rs"]
mod tests;
