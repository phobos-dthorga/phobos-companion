//! Clean up (0.27.0; the owner, 20 Nov 2026: "we definitely need to implement some kind of ongoing cleanup process", with their yes
//! before anything goes): what the tools, builds and tests left behind, by group, from the kit's `cleanup`, and deleting only the
//! groups the owner chose, after their press and confirmation, while the manifest still calls it `writes`.
//!
//! Every repository with its own rules (`config/cleanup.json`) is listed; the kit's own leftovers (its cache, its development build,
//! git's file-watcher daemons) come with each listing, so items are merged by path. With no repository holding rules, the first on
//! the list is used, for the kit's own leftovers alone. Nothing is deleted that the listing did not name.

use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::games::{self, Repository};
use companion_core::kit;
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;

const TOOL: &str = "cleanup";
const RULES: [&str; 2] = ["config", "cleanup.json"];
/// The most groups one press may name, and the longest name.
const MAX_GROUPS: usize = 40;
const MAX_GROUP: usize = 120;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Group {
    pub group: String,
    pub items: u64,
    pub bytes: u64,
    pub why: String,
}

/// What could go, by group, largest first.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Listing {
    pub groups: Vec<Group>,
    pub bytes: u64,
    pub daemons: u64,
    /// The repositories whose rules were read.
    pub repositories: Vec<String>,
    /// Anything a listing said it left alone, or could not delete.
    pub notes: Vec<String>,
}

fn roots() -> Result<Vec<Repository>, Failure> {
    let every = games::every_repository()?;
    let with_rules: Vec<Repository> =
        every.iter().filter(|r| r.path.join(RULES[0]).join(RULES[1]).is_file()).cloned().collect();
    Ok(if with_rules.is_empty() { every.into_iter().take(1).collect() } else { with_rules })
}

/// The groups as one listing, items merged by path across the repositories' listings.
pub fn merge(answers: &[Value]) -> (Vec<Group>, u64, u64, Vec<String>) {
    let mut seen: BTreeMap<String, (String, u64, String)> = BTreeMap::new();
    let mut daemons = 0;
    let mut notes = Vec::new();
    for answer in answers {
        for item in answer["data"]["items"].as_array().map_or(&[][..], Vec::as_slice) {
            let path = item["path"].as_str().unwrap_or_default().to_owned();
            seen.entry(path).or_insert_with(|| {
                (
                    item["group"].as_str().unwrap_or_default().to_owned(),
                    item["bytes"].as_u64().unwrap_or(0),
                    item["why"].as_str().unwrap_or_default().to_owned(),
                )
            });
        }
        daemons = daemons.max(answer["data"]["daemons"].as_u64().unwrap_or(0));
        for section in answer["report"]["sections"].as_array().map_or(&[][..], Vec::as_slice) {
            if matches!(section["heading"].as_str(), Some("Left alone" | "Could not delete")) {
                for block in section["blocks"].as_array().map_or(&[][..], Vec::as_slice) {
                    for line in block["items"].as_array().map_or(&[][..], Vec::as_slice) {
                        if let Some(text) = line.as_str()
                            && !notes.iter().any(|n| n == text)
                        {
                            notes.push(text.to_owned());
                        }
                    }
                }
            }
        }
    }
    let mut groups: BTreeMap<String, Group> = BTreeMap::new();
    for (group, bytes, why) in seen.into_values() {
        let entry = groups.entry(group.clone()).or_insert(Group { group, items: 0, bytes: 0, why: why.clone() });
        entry.items += 1;
        entry.bytes += bytes;
        if entry.why != why {
            entry.why = "several reasons".to_owned();
        }
    }
    let mut groups: Vec<Group> = groups.into_values().collect();
    groups.sort_by(|a, b| b.bytes.cmp(&a.bytes).then(a.group.cmp(&b.group)));
    let bytes = groups.iter().map(|g| g.bytes).sum();
    (groups, bytes, daemons, notes)
}

fn listing(answers: &[Value], repositories: Vec<String>) -> Listing {
    let (groups, bytes, daemons, notes) = merge(answers);
    Listing { groups, bytes, daemons, repositories, notes }
}

/// What could go now. Only reads.
pub fn list(listener: Option<kit::Listener>) -> Result<Listing, Failure> {
    let roots = roots()?;
    let mut answers = Vec::new();
    for root in &roots {
        answers.push(kit::run_hearing(TOOL, &arguments(&root.path, &[], false), listener)?);
    }
    Ok(listing(&answers, roots.into_iter().map(|r| r.name).collect()))
}

/// The arguments for one repository: a listing, or deleting the chosen groups.
pub fn arguments(root: &std::path::Path, groups: &[String], apply: bool) -> Vec<String> {
    let mut arguments = vec![TOOL.to_owned()];
    arguments.extend(["--root".to_owned(), root.display().to_string()]);
    for group in groups {
        arguments.push(format!("--group={group}"));
    }
    if apply {
        arguments.push("--apply".to_owned());
    }
    arguments.extend(["--no-redact".to_owned(), "--json".to_owned()]);
    arguments
}

/// Whether the window's choice is a list of group names the host will pass on.
pub fn checked_groups(groups: &[String]) -> Result<(), String> {
    if groups.is_empty() || groups.len() > MAX_GROUPS {
        return Err(format!("choose between 1 and {MAX_GROUPS} groups"));
    }
    for group in groups {
        if group.is_empty()
            || group.chars().count() > MAX_GROUP
            || checks::one_line(group) != *group
            || group.starts_with('-')
        {
            return Err(format!("{group:?} is not a group the tools name"));
        }
    }
    Ok(())
}

/// Deletes the chosen groups, after the owner's press and confirmation; what went is the new listing's difference.
pub fn apply(groups: &[String], listener: Option<kit::Listener>) -> Result<Listing, Failure> {
    checked_groups(groups).map_err(Failure::refused)?;
    kit::allowed_by_manifest(&kit::read_manifest()?, TOOL, "").map_err(Failure::refused)?;
    let roots = roots()?;
    let mut answers = Vec::new();
    for root in &roots {
        answers.push(kit::run_hearing(TOOL, &arguments(&root.path, groups, true), listener)?);
    }
    Ok(listing(&answers, roots.into_iter().map(|r| r.name).collect()))
}

#[cfg(test)]
#[path = "tests/cleanup_page.rs"]
mod tests;
