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

#[test]
fn a_node_is_a_language_prefixed_id_on_one_line() {
    assert!(node_id("cs:Phobos.Framework.TopUp.Seen.Note"));
    assert!(node_id("def:ThingDef/Lamp"));
    assert!(node_id("lua:file:lua/lamps.lua"));
    assert!(node_id("py:tools.keeper.Keeper.run"));
    assert!(node_id("data:key/Lamps_Lit"));
    assert!(node_id("data:key/PhobosBank/Plugin.loaded"));
    assert!(!node_id("--all"));
    assert!(!node_id("rs:main"));
    assert!(!node_id("cs:A\nB"));
    assert!(!node_id(&format!("cs:{}", "x".repeat(MAX_NODE))));
}

#[test]
fn a_search_is_one_line_of_a_sane_length() {
    assert!(search_pattern("*Tick*"));
    assert!(!search_pattern("   "));
    assert!(!search_pattern("a\nb"));
    assert!(!search_pattern(&"x".repeat(MAX_PATTERN + 1)));
}

#[test]
fn a_label_is_folded_onto_one_line_and_kept_short() {
    assert_eq!(label("  day\n 40 ").unwrap(), "day 40");
    assert_eq!(label("").unwrap(), "");
    assert_eq!(label(&"é".repeat(MAX_LABEL)).unwrap().chars().count(), MAX_LABEL);
    assert!(label(&"x".repeat(MAX_LABEL + 1)).is_err());
}

#[test]
fn a_type_name_is_one_line_of_the_marks_a_dotnet_name_holds() {
    assert!(type_name("Verse.Pawn"));
    assert!(type_name("System.Collections.Generic.Dictionary<System.String, Verse.Def>"));
    assert!(type_name("MouseoverSounds+MouseoverRegionCall[]"));
    assert!(type_name("System.Collections.Generic.List`1"));
    assert!(type_name("<>c__DisplayClass12_0"));
    assert!(type_name("Größe.Ding"));
    assert!(!type_name(""));
    assert!(!type_name("--json"));
    assert!(!type_name(" Verse.Pawn"));
    assert!(!type_name("Verse.Pawn\n{\"op\":\"release\"}"));
    assert!(!type_name("Verse.Pawn\"}"));
    assert!(!type_name("a/b"));
    assert!(!type_name(&"A".repeat(MAX_TYPE_NAME + 1)));
}

#[test]
fn an_address_is_hexadecimal_after_0x() {
    assert!(memory_address("0x1629EFD6E98"));
    assert!(memory_address("0xabc"));
    assert!(memory_address("0xFFFFFFFFFFFFFFFF"));
    assert!(!memory_address("0x"));
    assert!(!memory_address("1629EFD6E98"));
    assert!(!memory_address("0X1629"));
    assert!(!memory_address("0x1FFFFFFFFFFFFFFFF"));
    assert!(!memory_address("0x12g4"));
    assert!(!memory_address("0x12 "));
}

#[test]
fn a_repository_file_stays_inside_its_repository() {
    assert!(repository_file("mods/PhobosVehicles/Textures/Tipper_ArmouredCab_north.png"));
    assert!(repository_file("assets/phobos-audio/washer motor/a.wav"));
    assert!(!repository_file(""));
    assert!(!repository_file("../elsewhere/a.png"));
    assert!(!repository_file("/a.png"));
    assert!(!repository_file("C:/a.png"));
    assert!(!repository_file("HEAD:a.png"));
    assert!(!repository_file("mods\\a.png"));
    assert!(!repository_file("--output=a.png"));
    assert!(!repository_file(&"x".repeat(MAX_PATH + 1)));
}
