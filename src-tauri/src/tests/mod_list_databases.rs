use super::*;
use std::collections::BTreeMap;
use std::path::PathBuf;

fn zed() -> GamePlaces {
    let mut places = BTreeMap::new();
    places.insert("data".to_owned(), PathBuf::from("/games/zed"));
    GamePlaces { name: "Zed Game".to_owned(), steam_app_id: Some(294100), places }
}

#[test]
fn reading_never_fetches_a_fetch_may_take_only_the_stale_and_bringing_over_always_applies() {
    let read = databases_arguments(&zed(), false, true);
    assert_eq!(read[..2], ["mod-list", "databases"]);
    assert!(!read.contains(&"--fetch".to_owned()) && !read.contains(&"--stale".to_owned()));
    let stale = databases_arguments(&zed(), true, true);
    assert!(stale.contains(&"--fetch".to_owned()) && stale.contains(&"--stale".to_owned()));
    assert!(!databases_arguments(&zed(), true, false).contains(&"--stale".to_owned()));
    let import = import_arguments(&zed());
    assert!(import.contains(&"--import-manager".to_owned()) && import.contains(&"--apply".to_owned()));
}

#[test]
fn a_fetch_waits_for_its_switch_and_a_game_on_the_list() {
    let data = std::env::temp_dir().join(format!("mod-databases-{}", std::process::id()));
    std::fs::create_dir_all(&data).unwrap();
    online::choose(&data, MOD_DATABASES, false).unwrap();
    assert!(!online::is_on(&data, MOD_DATABASES));
    assert!(databases(&data, "rimworld", true, false, None).is_err());
    assert!(databases(&data, "not a game", false, false, None).is_err());
    std::fs::remove_dir_all(&data).unwrap();
}
