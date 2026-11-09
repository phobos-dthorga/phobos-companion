use super::*;

#[test]
fn finds_the_newest_draft_and_counts_the_rest() {
    let text = "# D'thorga Framework changelog\n\n## [Unreleased]\n\n## [0.46.1] - 2026-11-09 - Draft\n\n- A\n\n## [0.46.0] - 2026-11-08 - Draft\n\n- B\n\n## [0.1.0] - 2026-01-01\n\n- C\n";
    let found = parse(text, "repo").unwrap();
    assert_eq!(found.product, "D'thorga Framework");
    assert_eq!(found.draft_version.as_deref(), Some("0.46.1"));
    assert_eq!(found.draft_date.as_deref(), Some("2026-11-09"));
    assert_eq!(found.earlier_drafts, 1);
    assert_eq!(found.unreleased, 0);
}

#[test]
fn counts_entries_waiting_for_a_version() {
    let text = "# Thing changelog\n\n## [Unreleased]\n\n### Added\n\n- One\n- Two\n  - a detail, not an entry\n\n## [1.0.0] - 2026-01-01\n\n- Old\n";
    let found = parse(text, "repo").unwrap();
    assert_eq!(found.unreleased, 2);
    assert_eq!(found.draft_version, None);
}

#[test]
fn says_nothing_when_everything_is_released() {
    assert_eq!(parse("# Thing\n\n## [Unreleased]\n\n## [1.0.0] - 2026-01-01\n\n- Old\n", "repo"), None);
}

#[test]
fn a_bare_title_falls_back_to_the_repository() {
    let found = parse("# Changelog\n\n## [Unreleased]\n\n- One\n", "mod-thing").unwrap();
    assert_eq!(found.product, "mod-thing");
}

#[test]
fn copes_with_windows_line_endings() {
    let found = parse("# Thing changelog\r\n\r\n## [Unreleased]\r\n\r\n- One\r\n", "repo").unwrap();
    assert_eq!(found.unreleased, 1);
}

#[test]
fn a_draft_with_no_brackets_has_no_version() {
    let found = parse("# Thing\n\n## Next - Draft\n", "repo").unwrap();
    assert_eq!(found.draft_version, None);
    assert_eq!(found.draft_date, None);
}
