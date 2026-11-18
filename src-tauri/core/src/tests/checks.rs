use super::*;

#[test]
fn a_changelog_path_stays_inside_its_repository() {
    assert!(changelog_path("CHANGELOG.md"));
    assert!(changelog_path("mods/PhobosFramework/CHANGELOG.md"));
    assert!(changelog_path("mods/Amber Eyrie Peace/CHANGELOG.md"));
    assert!(!changelog_path(""));
    assert!(!changelog_path("../other/CHANGELOG.md"));
    assert!(!changelog_path("mods/../../CHANGELOG.md"));
    assert!(!changelog_path("/CHANGELOG.md"));
    assert!(!changelog_path("C:/Users/someone/CHANGELOG.md"));
    assert!(!changelog_path("mods\\Thing\\CHANGELOG.md"));
    assert!(!changelog_path("mods//CHANGELOG.md"));
    assert!(!changelog_path("mods/Thing/README.md"));
    assert!(!changelog_path("--root/CHANGELOG.md"));
    assert!(!changelog_path(&format!("{}/CHANGELOG.md", "x".repeat(MAX_PATH))));
}

#[test]
fn a_commit_is_plain_hexadecimal_of_a_sane_length() {
    assert!(commit_hash("401c6a93"));
    assert!(commit_hash(&"a".repeat(40)));
    assert!(!commit_hash("401c6a"));
    assert!(!commit_hash(&"a".repeat(41)));
    assert!(!commit_hash("401C6A93"));
    assert!(!commit_hash("--all"));
    assert!(!commit_hash("HEAD~1xx"));
}

#[test]
fn a_moment_is_an_iso_date_or_time() {
    assert!(moment("2026-11-12"));
    assert!(moment("2026-11-18T16:06:49+00:00"));
    assert!(moment("2026-11-18T16:06:49Z"));
    assert!(!moment(""));
    assert!(!moment("--before"));
    assert!(!moment("yesterday"));
    assert!(!moment("2026-11-12 15:00"));
    assert!(!moment(&"1".repeat(MAX_MOMENT + 1)));
}

#[test]
fn a_plain_name_is_a_folder_name_or_package_id() {
    assert!(plain_name("PhobosFramework"));
    assert!(plain_name("PhobosDthorga.Framework"));
    assert!(plain_name("Thing-20261101-120000"));
    assert!(!plain_name(""));
    assert!(!plain_name("--apply"));
    assert!(!plain_name(".."));
    assert!(!plain_name("a/b"));
    assert!(!plain_name("a b"));
    assert!(!plain_name(&"x".repeat(MAX_NAME + 1)));
}

#[test]
fn a_setting_is_a_plain_key_and_one_line_value() {
    assert!(setting_key("historyPath"));
    assert!(!setting_key(""));
    assert!(!setting_key("--clear"));
    assert!(!setting_key("history path"));
    assert!(!setting_key(&"a".repeat(MAX_KEY + 1)));
    assert!(setting_value("K:\\phobos-modkit\\history"));
    assert!(setting_value("  /home/someone/history  "));
    assert!(!setting_value("   "));
    assert!(!setting_value("--clear"));
    assert!(!setting_value("K:\\one\nK:\\two"));
    assert!(!setting_value(&"x".repeat(MAX_VALUE + 1)));
}

#[test]
fn text_folds_onto_one_line() {
    assert_eq!(one_line("  **Boats float.**\n On water. "), "**Boats float.** On water.");
}
