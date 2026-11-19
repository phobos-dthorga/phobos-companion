use super::*;

const CHANGELOG: &str = "# Changelog

## [Unreleased]

## [0.3.0] - 2026-11-20

Three things the owner asked for.
Not yet tested on screen.

### Added

- A thing.

## [0.2.1] - 2026-11-19

### Fixed

- A fix with no opening paragraph.

## [0.2.0]

The first page.
";

#[test]
fn reads_each_version_with_its_date_and_opening() {
    let notes = version_notes(CHANGELOG);
    let versions: Vec<&str> = notes.iter().map(|n| n.version.as_str()).collect();
    assert_eq!(versions, ["0.3.0", "0.2.1", "0.2.0"]);
    assert_eq!(notes[0].date.as_deref(), Some("2026-11-20"));
    assert_eq!(notes[0].summary, "Three things the owner asked for. Not yet tested on screen.");
    assert_eq!(notes[1].summary, "");
    assert_eq!(notes[2].date, None);
}

#[test]
fn lists_only_newer_versions_newest_first() {
    let notes = version_notes(CHANGELOG);
    let newer: Vec<String> = newer_than(&notes, "0.2.0").into_iter().map(|n| n.version).collect();
    assert_eq!(newer, ["0.3.0", "0.2.1"]);
    assert!(newer_than(&notes, "0.3.0").is_empty());
    assert!(newer_than(&notes, "not a version").is_empty());
    // 0.10.0 is newer than 0.9.0: numbers, not text.
    let ten = version_notes("## [0.10.0]\n\n## [0.9.0]\n");
    assert_eq!(newer_than(&ten, "0.9.0").len(), 1);
}

#[test]
fn gives_a_remote_as_a_web_address() {
    assert_eq!(
        web_address("https://github.com/someone/thing.git\n").as_deref(),
        Some("https://github.com/someone/thing")
    );
    assert_eq!(web_address("git@github.com:someone/thing.git").as_deref(), Some("https://github.com/someone/thing"));
    assert_eq!(web_address("/some/local/folder"), None);
}

#[test]
fn reads_the_libraries_inside_the_program_from_the_notices() {
    let notices = "# Notices

## In the program

| Package | Licence | Why it is used |
| --- | --- | --- |
| [Tauri](https://tauri.app/) (`tauri`) | MIT OR Apache-2.0 | The window |
| `html-to-image` 1.11.13 | MIT | Pictures |

## Only to build and check it

| Package | Licence | Why it is used |
| --- | --- | --- |
| `vite` | MIT | Builds |
";
    let found = libraries(notices);
    assert_eq!(
        found,
        [
            Library { name: "Tauri".to_owned(), licence: "MIT OR Apache-2.0".to_owned() },
            Library { name: "html-to-image".to_owned(), licence: "MIT".to_owned() },
        ]
    );
    assert!(libraries("no table here").is_empty());
}

#[test]
fn reads_this_repository_without_failing() {
    let about = read(None);
    assert_eq!(about.version, VERSION);
    assert!(about.this_version.is_some(), "the changelog has a heading for the running version");
    assert!(!about.libraries.is_empty());
}
