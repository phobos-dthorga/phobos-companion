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

// ---------------------------------------------------------------- screenshots, seen (0.32.0)

#[test]
fn the_screenshots_list_passes_only_the_places_it_reads() {
    let mut places = zed().places;
    places.insert("saves".to_owned(), PathBuf::from("/games/zed/saves"));
    let game = GamePlaces { places, ..zed() };
    assert_eq!(
        shot_arguments(&game),
        [
            "game-files",
            "screenshots",
            "--name=Zed Game",
            "--app-id=108600",
            "--data",
            "/games/zed",
            "--no-redact",
            "--json"
        ]
    );
}

#[test]
fn only_a_listed_picture_is_handed_over() {
    let folder = std::env::temp_dir().join(format!("companion-shots-{}", std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let listed = folder.join("listed.png");
    let unlisted = folder.join("unlisted.png");
    let not_a_picture = folder.join("notes.txt");
    for file in [&listed, &unlisted, &not_a_picture] {
        std::fs::write(file, b"\x89PNG").unwrap();
    }
    let list = json!([{ "path": listed.to_string_lossy() }, { "path": not_a_picture.to_string_lossy() }]);
    remember_shots(listed_shots(&list), vec![folder.clone()]);
    let handed = shot(&listed.to_string_lossy());
    let refused = shot(&unlisted.to_string_lossy());
    let text = shot(&not_a_picture.to_string_lossy());
    std::fs::remove_dir_all(&folder).unwrap();
    assert_eq!(handed.unwrap(), b"\x89PNG");
    assert!(refused.unwrap_err().detail.contains("only a screenshot a list named"));
    assert!(text.is_err());
    assert!(is_picture(Path::new("a/b.JPG")));
    assert!(!is_picture(Path::new("a/b.rws")));
}
