use super::*;
use serde_json::json;
use std::collections::BTreeMap;
use std::path::PathBuf;

fn zed() -> GamePlaces {
    let mut places = BTreeMap::new();
    places.insert("data".to_owned(), PathBuf::from("/games/zed"));
    GamePlaces { name: "Zed Game".to_owned(), steam_app_id: Some(108600), places }
}

#[test]
fn the_check_passes_the_name_the_id_the_data_folder_and_steam_only_when_asked() {
    assert_eq!(
        check_arguments(&zed(), true),
        [
            "mod-list",
            "check",
            "--name=Zed Game",
            "--app-id=108600",
            "--data",
            "/games/zed",
            "--online",
            "--no-redact",
            "--json"
        ]
    );
    let bare = GamePlaces { name: "Ar".to_owned(), ..GamePlaces::default() };
    assert_eq!(check_arguments(&bare, false), ["mod-list", "check", "--name=Ar", "--no-redact", "--json"]);
}

#[test]
fn a_change_and_an_undo_always_apply_and_keep_the_window_s_text_one_argument() {
    let change = fix_arguments(&zed(), "default", "remove", "--evil mod id");
    assert!(change.contains(&"--list=default".to_owned()));
    assert!(change.contains(&"--remove=--evil mod id".to_owned()));
    assert!(change.contains(&"--apply".to_owned()));
    let undo = undo_arguments(&zed(), "save:Sandbox/Run 1");
    assert!(undo.contains(&"--list=save:Sandbox/Run 1".to_owned()));
    assert!(undo.contains(&"--apply".to_owned()));
}

#[test]
fn the_check_names_the_changes_lists_and_workshop_pages_it_offers() {
    let data = json!({
        "lists": [{"key": "active", "writable": true}, {"key": "presets", "writable": false}],
        "problems": [
            {"fixes": [{"action": "remove", "list_key": "active", "id": "example.gone"}], "workshop_id": "3820401180"},
            {"fixes": [], "workshop_id": "not a number"},
        ]
    });
    let (changes, lists, numbers) = offered_by("rimworld", &data);
    assert_eq!(changes, [("rimworld".to_owned(), "active".to_owned(), "remove".to_owned(), "example.gone".to_owned())]);
    assert_eq!(lists, [("rimworld".to_owned(), "active".to_owned())]);
    assert_eq!(numbers, ["3820401180"]);
}

#[test]
fn only_offered_changes_known_lists_and_named_pages_are_accepted() {
    assert!(change("rimworld", "active", "delete", "x", None).is_err());
    assert!(change("rimworld", "active", "remove", "never.offered", None).is_err());
    assert!(change("../evil", "active", "remove", "x", None).is_err());
    assert!(undo("rimworld", "never-checked", None).is_err());
    assert!(open_in_steam("123456789").is_err());
    assert!(open_in_steam("steam://evil").is_err());
}

#[test]
fn text_and_numbers_are_checked_for_shape() {
    assert!(sane_text("Some Workshop Mod's Name"));
    assert!(!sane_text("two\nlines"));
    assert!(!sane_text("   "));
    assert!(workshop_number("3820401180"));
    assert!(!workshop_number("12345"));
    assert!(!workshop_number("38204O1180"));
    assert_eq!(steam_page("3820401180"), "steam://url/CommunityFilePage/3820401180");
}

#[test]
fn the_editor_lists_and_changes_with_a_place_when_one_is_given() {
    assert_eq!(
        mods_arguments(&zed()),
        ["mod-list", "mods", "--name=Zed Game", "--app-id=108600", "--data", "/games/zed", "--no-redact", "--json"]
    );
    let moved = edit_arguments(&zed(), "default", "move", &["Some Mod".to_owned(), "Other".to_owned()], Some(3));
    assert!(moved.contains(&"--move=Some Mod".to_owned()));
    assert!(moved.contains(&"--move=Other".to_owned()));
    assert!(moved.windows(2).any(|pair| pair == ["--to", "3"]));
    assert!(moved.contains(&"--apply".to_owned()));
    assert!(!edit_arguments(&zed(), "default", "remove", &["Some Mod".to_owned()], None).contains(&"--to".to_owned()));
}

#[test]
fn the_sort_writes_only_when_asked_and_rules_keep_the_window_s_text_one_argument() {
    let preview = sort_arguments(&zed(), "default", false, false);
    assert!(!preview.contains(&"--apply".to_owned()) && !preview.contains(&"--full".to_owned()));
    let written = sort_arguments(&zed(), "default", true, true);
    assert!(written.contains(&"--apply".to_owned()) && written.contains(&"--full".to_owned()));
    let after = add_rule_arguments(&zed(), "Some Mod", "after", "--drop 1");
    assert!(after.contains(&"--mod=Some Mod".to_owned()));
    assert!(after.contains(&"--after=--drop 1".to_owned()));
    let top = add_rule_arguments(&zed(), "x", "top", "");
    assert!(top.contains(&"--top".to_owned()) && top.contains(&"--apply".to_owned()));
    assert!(drop_rule_arguments(&zed(), 2).windows(2).any(|pair| pair == ["--drop", "2"]));
}

#[test]
fn several_mods_at_once_are_checked_for_shape() {
    let two = ["a".to_owned(), "b".to_owned()];
    assert!(sane_ids(&two));
    assert!(!sane_ids(&[]));
    assert!(!sane_ids(&["a".to_owned(), "a".to_owned()]));
    let many: Vec<String> = (0..=MAX_TOGETHER).map(|n| format!("m{n}")).collect();
    assert!(!sane_ids(&many));
}

#[test]
fn a_listing_names_its_mods_entries_and_the_lists_the_kit_changes() {
    let data = json!({
        "mods": [{"id": "example.inn"}],
        "lists": [
            {"key": "active", "writable": true, "entries": [{"id": "example.gone"}]},
            {"key": "presets", "writable": false, "entries": []},
        ]
    });
    let (ids, lists) = known_by("rimworld", &data);
    assert_eq!(
        ids,
        [("rimworld".to_owned(), "example.inn".to_owned()), ("rimworld".to_owned(), "example.gone".to_owned())]
    );
    assert_eq!(lists, [("rimworld".to_owned(), "active".to_owned())]);
}

#[test]
fn the_editor_refuses_unknown_mods_odd_places_and_other_changes() {
    let x = ["x".to_owned()];
    assert!(edit("rimworld", "active", "remove-extra", &x, None, None).is_err());
    assert!(edit("rimworld", "active", "move", &x, None, None).is_err());
    assert!(edit("rimworld", "active", "move", &x, Some(0), None).is_err());
    assert!(edit("rimworld", "active", "move", &x, Some(MAX_PLACE + 1), None).is_err());
    assert!(edit("rimworld", "active", "remove", &["never.listed".to_owned()], None, None).is_err());
}

#[test]
fn the_sort_and_rules_refuse_unknown_lists_mods_kinds_and_numbers() {
    assert!(sort("rimworld", "never.listed", false, true, None).is_err());
    assert!(add_rule("rimworld", "x", "sideways", "y").is_err());
    assert!(add_rule("rimworld", "never.listed", "after", "also.never").is_err());
    assert!(drop_rule("rimworld", 0).is_err());
    assert!(drop_rule("rimworld", MAX_RULE + 1).is_err());
}
