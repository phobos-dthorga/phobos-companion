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
