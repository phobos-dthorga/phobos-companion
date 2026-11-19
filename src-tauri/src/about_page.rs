//! The About page (0.25.0; the owner: "I keep forgetting which version I have installed and I cannot find a version number
//! anywhere"): which version is running, what it was built from and when, and what the repository it was built from holds since,
//! with the installer for it when one has been built. It only reads.

use companion_core::{git, repository_root};
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

const VERSION: &str = env!("CARGO_PKG_VERSION");
/// Set by `build.rs`: the commit and the moment this program was built, and where its build output went.
const BUILT_COMMIT: &str = env!("COMPANION_BUILT_COMMIT");
const BUILT_UNIX: &str = env!("COMPANION_BUILT_UNIX");
const TARGET_DIR: Option<&str> = option_env!("COMPANION_TARGET_DIR");
/// The most newer versions listed; the Changes page has the rest.
const NEWER_SHOWN: usize = 10;
/// The heading of the notices' table of what is inside the program.
const IN_THE_PROGRAM: &str = "## In the program";

/// One version's line from the changelog: its number, its date, and its opening paragraph.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct VersionNote {
    pub version: String,
    pub date: Option<String>,
    pub summary: String,
}

/// A library inside the program, and its licence, from the notices.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Library {
    pub name: String,
    pub licence: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct About {
    pub version: String,
    pub built_commit: Option<String>,
    pub built_unix: Option<i64>,
    /// The folder of the repository it was built from, where it finds the tool kit and the games list.
    pub built_from: String,
    pub repository_name: String,
    pub program: Option<String>,
    pub data_folder: Option<String>,
    /// Where its source is published, from the repository's own remote.
    pub source: Option<String>,
    /// The version the repository holds now, when it can be read.
    pub repository_version: Option<String>,
    /// Commits in the repository since the one this was built from.
    pub commits_since: Option<u32>,
    pub this_version: Option<VersionNote>,
    /// Versions in the changelog newer than this one, newest first.
    pub newer: Vec<VersionNote>,
    /// The installer built for the repository's version, when it is not this one and has been built.
    pub installer: Option<String>,
    pub libraries: Vec<Library>,
}

/// Everything the page shows; whatever cannot be read is left out, never a failure.
pub fn read(data_folder: Option<PathBuf>) -> About {
    let root = repository_root();
    let root = root.canonicalize().unwrap_or(root);
    let built_commit = Some(BUILT_COMMIT.to_owned()).filter(|c| !c.is_empty());
    let changelog = fs::read_to_string(root.join("CHANGELOG.md")).unwrap_or_default();
    let notes = version_notes(&changelog);
    let repository_version = package_version(&root);
    let installer = repository_version
        .as_deref()
        .filter(|version| *version != VERSION)
        .and_then(|version| installer_for(TARGET_DIR.map(Path::new), version));
    About {
        version: VERSION.to_owned(),
        commits_since: built_commit.as_deref().and_then(|commit| commits_since(&root, commit)),
        built_commit,
        built_unix: BUILT_UNIX.parse().ok().filter(|unix| *unix > 0),
        built_from: shown(&root),
        repository_name: root.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default(),
        program: std::env::current_exe().ok().map(|p| shown(&p)),
        data_folder: data_folder.map(|p| shown(&p)),
        source: git::text(&root, &["remote", "get-url", "origin"]).and_then(|url| web_address(&url)),
        repository_version,
        this_version: notes.iter().find(|n| n.version == VERSION).cloned(),
        newer: newer_than(&notes, VERSION),
        installer,
        libraries: libraries(&fs::read_to_string(root.join("THIRD_PARTY_NOTICES.md")).unwrap_or_default()),
    }
}

/// A path as the owner would type it, without Windows' `\\?\` prefix.
fn shown(path: &Path) -> String {
    let text = path.display().to_string();
    text.strip_prefix(r"\\?\").map(str::to_owned).unwrap_or(text)
}

fn package_version(root: &Path) -> Option<String> {
    let text = fs::read_to_string(root.join("package.json")).ok()?;
    let value: Value = serde_json::from_str(&text).ok()?;
    value.get("version")?.as_str().map(str::to_owned)
}

fn commits_since(root: &Path, commit: &str) -> Option<u32> {
    git::text(root, &["rev-list", "--count", &format!("{commit}..HEAD")])?.parse().ok()
}

/// The installer for a version in the bundle folder, found by the name's ending, so the product's name is never written here.
fn installer_for(target: Option<&Path>, version: &str) -> Option<String> {
    let folder = target?.join("release").join("bundle").join("nsis");
    let ending = format!("_{version}_x64-setup.exe");
    fs::read_dir(&folder)
        .ok()?
        .flatten()
        .map(|entry| entry.path())
        .find(|path| path.file_name().is_some_and(|name| name.to_string_lossy().ends_with(&ending)))
        .map(|path| shown(&path))
}

/// A remote's web address: `https://host/path`, from either form git keeps (`https://…` or `git@host:path`).
pub(crate) fn web_address(remote: &str) -> Option<String> {
    let remote = remote.trim().trim_end_matches(".git");
    if remote.starts_with("https://") {
        return Some(remote.to_owned());
    }
    let (host, path) = remote.strip_prefix("git@")?.split_once(':')?;
    Some(format!("https://{host}/{path}"))
}

/// Each released or drafted version in a changelog, in its order: number, date and the first paragraph under its heading.
pub(crate) fn version_notes(changelog: &str) -> Vec<VersionNote> {
    let mut notes = Vec::new();
    let mut lines = changelog.lines().peekable();
    while let Some(line) = lines.next() {
        let Some(rest) = line.strip_prefix("## [") else { continue };
        let Some((version, after)) = rest.split_once(']') else { continue };
        if version.eq_ignore_ascii_case("unreleased") {
            continue;
        }
        let date = after.trim().strip_prefix('-').map(|d| d.trim().to_owned()).filter(|d| !d.is_empty());
        let mut summary = Vec::new();
        while let Some(next) = lines.peek() {
            if next.starts_with("## ") || (next.starts_with("### ") && summary.is_empty()) {
                break;
            }
            let next = lines.next().unwrap_or_default().trim();
            if next.is_empty() {
                if summary.is_empty() {
                    continue;
                }
                break;
            }
            summary.push(next);
        }
        notes.push(VersionNote { version: version.to_owned(), date, summary: summary.join(" ") });
    }
    notes
}

fn number(version: &str) -> Option<(u64, u64, u64)> {
    let mut parts = version.split('.').map(|p| p.parse::<u64>().ok());
    Some((parts.next()??, parts.next()??, parts.next()??))
}

/// The versions newer than `than`, newest first, at most `NEWER_SHOWN`.
pub(crate) fn newer_than(notes: &[VersionNote], than: &str) -> Vec<VersionNote> {
    let Some(running) = number(than) else { return Vec::new() };
    let mut newer: Vec<VersionNote> =
        notes.iter().filter(|n| number(&n.version).is_some_and(|v| v > running)).cloned().collect();
    newer.sort_by_key(|n| std::cmp::Reverse(number(&n.version)));
    newer.truncate(NEWER_SHOWN);
    newer
}

/// The libraries inside the program, from the notices' table under "In the program": each row's name and licence.
pub(crate) fn libraries(notices: &str) -> Vec<Library> {
    let Some(start) = notices.find(IN_THE_PROGRAM) else { return Vec::new() };
    let section = &notices[start + IN_THE_PROGRAM.len()..];
    let section = section.find("\n## ").map_or(section, |end| &section[..end]);
    section
        .lines()
        .filter(|line| line.starts_with('|') && !line.starts_with("| ---") && !line.starts_with("| Package"))
        .filter_map(|line| {
            let cells: Vec<&str> = line.trim_matches('|').split('|').map(str::trim).collect();
            let first = cells.first()?;
            let name = match (first.find('['), first.find(']')) {
                (Some(open), Some(close)) if close > open => &first[open + 1..close],
                _ => first.split([' ', ',', '(']).next().unwrap_or(first),
            };
            Some(Library { name: name.trim().trim_matches('`').to_owned(), licence: (*cells.get(1)?).to_owned() })
        })
        .collect()
}

#[cfg(test)]
#[path = "tests/about_page.rs"]
mod tests;
