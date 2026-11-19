use super::*;
use serde_json::json;
use std::collections::BTreeMap;

fn zed() -> GamePlaces {
    let mut places = BTreeMap::new();
    places.insert("data".to_owned(), PathBuf::from("/games/zed"));
    GamePlaces { name: "Zed Game".to_owned(), steam_app_id: Some(108600), places }
}

#[test]
fn the_report_passes_the_name_the_id_the_places_and_the_moment() {
    assert_eq!(
        arguments(&zed(), Some("2026-11-18")),
        [
            "game-files",
            "report",
            "--name=Zed Game",
            "--app-id=108600",
            "--data",
            "/games/zed",
            "--since=2026-11-18",
            "--no-redact",
            "--json"
        ]
    );
    let bare = GamePlaces { name: "Ar".to_owned(), ..GamePlaces::default() };
    assert_eq!(arguments(&bare, None), ["game-files", "report", "--name=Ar", "--no-redact", "--json"]);
}

#[test]
fn a_file_is_shown_only_from_a_folder_the_report_named() {
    let folders =
        named_folders(&json!({"places": {"data": "/d", "saves": "/d/Saves", "screenshots": ["/steam/shots"]}}));
    assert_eq!(folders.len(), 3);
    assert!(inside(Path::new("/d/Saves/Colony.rws"), &folders));
    assert!(inside(Path::new("/d/Saves/Sandbox/Phobos-1"), &folders));
    assert!(inside(Path::new("/steam/shots/a.jpg"), &folders));
    assert!(!inside(Path::new("/elsewhere/a.jpg"), &folders));
    assert!(!inside(Path::new("/d/a/b/c/deep.txt"), &folders));
}

#[test]
fn the_launch_before_the_last_passes_as_previous_and_other_words_are_refused() {
    assert!(arguments(&zed(), Some(PREVIOUS)).contains(&"--since=previous".to_owned()));
    assert!(read("zed", Some("--evil".to_owned())).is_err());
}
