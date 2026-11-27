use super::*;
use std::collections::BTreeMap;
use std::path::PathBuf;

fn zed() -> GamePlaces {
    let mut places = BTreeMap::new();
    places.insert("data".to_owned(), PathBuf::from("/games/zed"));
    GamePlaces { name: "Zed Game".to_owned(), steam_app_id: Some(294100), places }
}

#[test]
fn subscribing_names_each_item_waits_only_when_asked_and_always_applies() {
    let two = ["3820401180".to_owned(), "1234567890".to_owned()];
    let waited = subscribe_arguments(&zed(), &two, true);
    assert!(waited.contains(&"--item=3820401180".to_owned()) && waited.contains(&"--item=1234567890".to_owned()));
    assert!(waited.windows(2).any(|pair| pair == ["--wait", "900"]));
    assert!(waited.contains(&"--apply".to_owned()));
    assert!(!subscribe_arguments(&zed(), &two, false).contains(&"--wait".to_owned()));
}

#[test]
fn unsubscribing_names_the_list_and_each_item() {
    let out = unsubscribe_arguments(&zed(), "active", &["3820401180".to_owned()]);
    assert!(out.contains(&"--list=active".to_owned()) && out.contains(&"--item=3820401180".to_owned()));
    assert!(out.contains(&"--apply".to_owned()));
}

#[test]
fn only_well_formed_numbers_and_known_mods_are_accepted() {
    assert!(sane_numbers(&["3820401180".to_owned()]));
    assert!(!sane_numbers(&[]));
    assert!(!sane_numbers(&["38204O1180".to_owned()]));
    assert!(!sane_numbers(&["3820401180".to_owned(), "3820401180".to_owned()]));
    assert!(subscribe("rimworld", &["not a number".to_owned()], false, None).is_err());
    assert!(unsubscribe("rimworld", "active", &["9999999999".to_owned()], None).is_err());
}

#[test]
fn what_players_say_reads_only_a_named_item_and_only_while_workshop_pages_is_on() {
    let data = std::env::temp_dir().join(format!("players-say-{}", std::process::id()));
    std::fs::create_dir_all(&data).unwrap();
    let arguments = players_arguments("3014915404");
    assert_eq!(arguments[..2], ["steam-workshop", "report"]);
    assert_eq!(arguments[arguments.len() - 2..], ["--", "3014915404"]);
    // Not named by a listing in this run: refused before Steam is asked.
    assert!(players_say(&data, "1234567890", None).is_err());
    WORKSHOP.lock().unwrap().insert("2222222222".to_owned());
    online::choose(&data, WORKSHOP_PAGES, false).unwrap();
    let refused = players_say(&data, "2222222222", None).unwrap_err();
    assert!(refused.detail.contains("Workshop pages is off"), "{refused:?}");
    assert!(players_say(&data, "not-a-number", None).is_err());
    std::fs::remove_dir_all(&data).unwrap();
}
