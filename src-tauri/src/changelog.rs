//! What a repository's changelogs say has not been released: entries with no version yet, and versions still in draft.

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const FILE: &str = "CHANGELOG.md";
const MODS_FOLDER: &str = "mods";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct PendingRelease {
    pub product: String,
    pub repository: String,
    pub unreleased: usize,
    pub draft_version: Option<String>,
    pub draft_date: Option<String>,
    pub earlier_drafts: usize,
}

/// Every changelog with something unreleased: the repository's own, and one per mod in a `mods` folder.
pub fn read_pending(repository_path: &Path, repository: &str) -> Vec<PendingRelease> {
    changelog_files(repository_path)
        .iter()
        .filter_map(|path| fs::read(path).ok())
        .filter_map(|bytes| parse(&String::from_utf8_lossy(&bytes), repository))
        .collect()
}

fn changelog_files(repository_path: &Path) -> Vec<PathBuf> {
    let mut files = vec![repository_path.join(FILE)];
    if let Ok(entries) = fs::read_dir(repository_path.join(MODS_FOLDER)) {
        let mut mods: Vec<PathBuf> = entries.flatten().map(|entry| entry.path().join(FILE)).collect();
        mods.sort();
        files.append(&mut mods);
    }
    files.retain(|path| path.is_file());
    files
}

#[derive(PartialEq)]
enum Section {
    Other,
    Unreleased,
}

fn parse(text: &str, repository: &str) -> Option<PendingRelease> {
    let mut product = None;
    let mut section = Section::Other;
    let mut unreleased = 0;
    let mut drafts: usize = 0;
    let mut draft_version = None;
    let mut draft_date = None;
    for line in text.trim_start_matches('\u{feff}').lines() {
        if product.is_none()
            && let Some(title) = line.strip_prefix("# ")
        {
            product = Some(product_name(title));
        }
        if let Some(heading) = line.strip_prefix("## ") {
            let lower = heading.to_lowercase();
            section = if lower.contains("unreleased") { Section::Unreleased } else { Section::Other };
            if lower.contains("draft") {
                drafts += 1;
                if drafts == 1 {
                    draft_version = version_in(heading);
                    draft_date = date_in(heading);
                }
            }
        } else if section == Section::Unreleased && (line.starts_with("- ") || line.starts_with("* ")) {
            unreleased += 1;
        }
    }
    if unreleased == 0 && drafts == 0 {
        return None;
    }
    let product = product.flatten().unwrap_or_else(|| repository.to_owned());
    Some(PendingRelease {
        product,
        repository: repository.to_owned(),
        unreleased,
        draft_version,
        draft_date,
        earlier_drafts: drafts.saturating_sub(1),
    })
}

/// "D'thorga Framework changelog" names D'thorga Framework; a title of just "Changelog" names nothing.
fn product_name(title: &str) -> Option<String> {
    let title = title.trim();
    let end = title.len().saturating_sub("changelog".len());
    let name = if title.is_char_boundary(end) && title[end..].eq_ignore_ascii_case("changelog") {
        &title[..end]
    } else {
        title
    };
    let name = name.trim();
    (!name.is_empty()).then(|| name.to_owned())
}

fn version_in(heading: &str) -> Option<String> {
    let start = heading.find('[')? + 1;
    let end = heading[start..].find(']')? + start;
    Some(heading[start..end].to_owned())
}

fn date_in(heading: &str) -> Option<String> {
    heading
        .split_whitespace()
        .find(|token| {
            let bytes = token.as_bytes();
            bytes.len() == 10
                && bytes.iter().enumerate().all(|(i, b)| if i == 4 || i == 7 { *b == b'-' } else { b.is_ascii_digit() })
        })
        .map(str::to_owned)
}

#[cfg(test)]
#[path = "tests/changelog.rs"]
mod tests;
