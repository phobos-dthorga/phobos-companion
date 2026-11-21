use super::*;
use serde_json::json;
use std::collections::BTreeMap;
use std::path::PathBuf;

fn zed() -> GamePlaces {
    let mut places = BTreeMap::new();
    places.insert("data".to_owned(), PathBuf::from("/games/zed"));
    GamePlaces { name: "Zed Game".to_owned(), steam_app_id: Some(294100), places }
}

#[test]
fn a_listing_names_each_list_by_source_and_ref() {
    let data = json!({"sources": {
        "saved": [{"ref": "Quiet"}],
        "save": [{"ref": "PG18.rws"}],
        "manager": [{"ref": "Default/2026.json"}],
        "kept": []
    }});
    let found = named_by("rimworld", &data);
    assert_eq!(found.len(), 3);
    assert!(found.contains(&("rimworld".to_owned(), "save".to_owned(), "PG18.rws".to_owned())));
}

#[test]
fn a_list_is_named_by_source_and_ref_or_by_a_chosen_file_and_loads_only_when_asked() {
    let preview = compare_arguments(&zed(), "active", "save", "PG18.rws", false);
    assert_eq!(preview[1], "compare");
    assert!(preview.contains(&"--from=save:PG18.rws".to_owned()));
    assert!(!preview.contains(&"--apply".to_owned()));
    let loaded = compare_arguments(&zed(), "active", "file", "C:/lists/Mine.rml", true);
    assert_eq!(loaded[1], "load");
    assert!(loaded.windows(2).any(|pair| pair[0] == "--file" && pair[1].ends_with("Mine.rml")));
    assert!(loaded.contains(&"--apply".to_owned()));
}

#[test]
fn saving_forgetting_and_writing_out_keep_the_window_s_text_one_argument() {
    let saved = save_arguments(&zed(), "active", "  --apply me ", true);
    assert!(saved.contains(&"--as=--apply me".to_owned()));
    assert!(saved.contains(&"--replace".to_owned()));
    assert!(forget_arguments(&zed(), "Quiet").contains(&"--saved=Quiet".to_owned()));
    let out = export_arguments(&zed(), "active", Some(("saved", "Quiet")), "C:/out/Quiet.rml");
    assert!(out.contains(&"--from=saved:Quiet".to_owned()));
    assert!(out.contains(&"--apply".to_owned()));
}

#[test]
fn names_and_searches_are_checked_and_kept_safe() {
    assert!(sane_name("Before the war"));
    assert!(!sane_name("   "));
    assert!(!sane_name(&"x".repeat(MAX_NAME + 1)));
    assert!(!sane_name("two\nlines"));
    assert_eq!(offered_name("Before: the war?"), "Before- the war.rml");
    assert_eq!(offered_name("???"), "Mod list.rml");
    assert_eq!(
        workshop_search(294100, "Smart Medicine & more"),
        "steam://openurl/https://steamcommunity.com/workshop/browse/?appid=294100&searchtext=Smart%20Medicine%20%26%20more"
    );
}

#[test]
fn only_lists_the_last_listing_named_or_files_chosen_are_accepted() {
    assert!(compare("rimworld", "active", "save", "never.rws", false, None).is_err());
    assert!(compare("rimworld", "active", "file", "C:/never/chosen.rml", true, None).is_err());
    assert!(forget("rimworld", "never").is_err());
    assert!(find_on_workshop("rimworld", "two\nlines").is_err());
}
