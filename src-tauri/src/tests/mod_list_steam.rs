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
