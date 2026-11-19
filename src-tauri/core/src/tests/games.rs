use super::*;

#[test]
fn joins_repositories_to_the_root() {
    let games =
        parse(r#"{"schema_version":1,"root":"/work","games":[{"id":"a","name":"Game A","repositories":["one"]}]}"#)
            .unwrap();
    assert_eq!(games[0].name, "Game A");
    assert_eq!(games[0].repositories[0].name, "one");
    assert_eq!(games[0].repositories[0].path, Path::new("/work").join("one"));
}

#[test]
fn works_without_a_root() {
    let games =
        parse(r#"{"schema_version":1,"games":[{"id":"a","name":"A","repositories":["some/where/two"]}]}"#).unwrap();
    assert_eq!(games[0].repositories[0].name, "two");
}

#[test]
fn accepts_a_byte_order_mark() {
    assert!(parse("\u{feff}{\"schema_version\":1,\"games\":[]}").unwrap().is_empty());
}

#[test]
fn refuses_a_format_it_does_not_know() {
    assert!(parse(r#"{"schema_version":2,"games":[]}"#).unwrap_err().contains("schema_version"));
}

#[test]
fn refuses_a_misspelt_field() {
    assert!(parse(r#"{"schema_version":1,"games":[],"rott":"/x"}"#).is_err());
}

#[test]
fn refuses_the_same_game_twice() {
    let text = r#"{"schema_version":1,"games":[{"id":"a","name":"A","repositories":[]},{"id":"a","name":"B","repositories":[]}]}"#;
    assert!(parse(text).unwrap_err().contains("twice"));
}

#[test]
fn the_example_list_is_valid() {
    let text = include_str!("../../../../config/games.example.json");
    assert_eq!(parse(text).unwrap().len(), 3);
}

#[test]
fn an_entry_is_a_game_unless_it_says_it_is_tools() {
    let text = r#"{"schema_version": 1, "games": [
        {"id": "g", "name": "G", "repositories": []},
        {"id": "t", "name": "T", "repositories": [], "kind": "tools"}]}"#;
    let kinds: Vec<GameKind> = parse(text).unwrap().iter().map(|game| game.kind).collect();
    assert_eq!(kinds, [GameKind::Game, GameKind::Tools]);
    let odd = r#"{"schema_version": 1, "games": [{"id": "x", "name": "X", "repositories": [], "kind": "toy"}]}"#;
    assert!(parse(odd).is_err());
}

#[test]
fn a_game_may_name_its_places_and_steam_id() {
    let text = r#"{"schema_version": 1, "games": [
        {"id": "z", "name": "Zed", "repositories": [], "steam_app_id": 108600, "places": {"data": "C:/Users/me/Zomboid"}},
        {"id": "r", "name": "Ar", "repositories": []}]}"#;
    let zed = places_in(text, "z").unwrap().unwrap();
    assert_eq!(zed.steam_app_id, Some(108600));
    assert_eq!(zed.places["data"], PathBuf::from("C:/Users/me/Zomboid"));
    assert!(places_in(text, "r").unwrap().unwrap().places.is_empty());
    assert!(places_in(text, "nobody").unwrap().is_none());
    assert_eq!(parse(text).unwrap().len(), 2);
    let odd =
        r#"{"schema_version": 1, "games": [{"id": "z", "name": "Zed", "repositories": [], "places": {"music": "x"}}]}"#;
    assert!(places_in(odd, "z").is_err());
}

// ---------------------------------------------------------------- adding a game (0.31.0)

const LIST: &str = r#"{
  "schema_version": 1,
  "root": "/work",
  "games": [
    {
      "id": "rimworld",
      "name": "RimWorld",
      "repositories": [
        "phobos-rimworld"
      ]
    }
  ]
}
"#;

fn farm() -> NewGame {
    NewGame {
        id: "farming-simulator-25".into(),
        name: "Farming Simulator 25".into(),
        steam_app_id: Some(2300320),
        data: Some(if cfg!(windows) {
            r"D:\Docs\My Games\FarmingSimulator2025".into()
        } else {
            "/docs/FarmingSimulator2025".into()
        }),
        repositories: vec!["FS25_PhobosLib".into()],
    }
}

#[test]
fn a_game_is_added_after_the_others_with_the_lists_order_kept() {
    let written = with_game(LIST, &farm(), |_| true).unwrap();
    assert!(written.starts_with("{\n  \"schema_version\": 1,\n  \"root\": \"/work\",\n  \"games\": ["), "{written}");
    let games = parse(&written).unwrap();
    assert_eq!(games.iter().map(|g| g.id.as_str()).collect::<Vec<_>>(), ["rimworld", "farming-simulator-25"]);
    assert_eq!(games[1].repositories[0].path, Path::new("/work").join("FS25_PhobosLib"));
    let places = places_in(&written, "farming-simulator-25").unwrap().unwrap();
    assert_eq!(places.steam_app_id, Some(2300320));
    assert!(places.places["data"].ends_with("FarmingSimulator2025"));
    assert!(written.ends_with("}\n"));
}

#[test]
fn a_game_with_no_data_folder_or_repositories_is_added_bare() {
    let game = NewGame { data: None, repositories: vec![], ..farm() };
    let written = with_game(LIST, &game, |_| false).unwrap();
    assert!(!written.contains("places"));
    assert!(written.contains("\"steam_app_id\": 2300320"));
}

#[test]
fn what_cannot_be_added_is_refused_in_words() {
    let refused = |game: NewGame| with_game(LIST, &game, |_| true).unwrap_err();
    assert!(refused(NewGame { id: "rimworld".into(), ..farm() }).contains("already RimWorld's"));
    assert!(refused(NewGame { id: "Farm Sim".into(), ..farm() }).contains("cannot be a game's id"));
    assert!(refused(NewGame { name: "rimworld".into(), ..farm() }).contains("already on the list, as rimworld"));
    assert!(refused(NewGame { name: " ".into(), ..farm() }).contains("one line"));
    assert!(refused(NewGame { data: Some("relative/folder".into()), ..farm() }).contains("full path"));
    assert!(refused(NewGame { repositories: vec!["../elsewhere".into()], ..farm() }).contains("not a folder's name"));
    let missing = with_game(LIST, &farm(), |path| !path.ends_with("FarmingSimulator2025")).unwrap_err();
    assert!(missing.contains("is not a folder on this PC"));
    let listed = with_game(LIST, &farm(), |_| true).unwrap();
    let again =
        with_game(&listed, &NewGame { id: "fs25".into(), name: "FS25".into(), ..farm() }, |_| true).unwrap_err();
    assert!(again.contains("Steam's game 2300320 is already on the list, as farming-simulator-25"));
}

#[test]
fn a_path_pasted_with_explorers_quotes_is_taken_without_them() {
    let quoted = NewGame { data: farm().data.map(|d| format!("\"{d}\"")), ..farm() };
    let written = with_game(LIST, &quoted, |_| true).unwrap();
    assert!(!written.contains("\\\""));
}

#[test]
fn ids_are_short_and_plain() {
    assert!(valid_id("workers-and-resources"));
    assert!(valid_id("fs25"));
    assert!(!valid_id("-start"));
    assert!(!valid_id("Upper"));
    assert!(!valid_id(&"a".repeat(MAX_ID + 1)));
}

#[test]
fn only_unlisted_git_folders_are_offered() {
    let root = std::env::temp_dir().join(format!("companion-unlisted-{}", std::process::id()));
    for (name, git) in [("listed", true), ("new-mod", true), ("Another", true), ("not-a-repo", false)] {
        fs::create_dir_all(root.join(name).join(if git { ".git" } else { "src" })).unwrap();
    }
    let found = unlisted_repositories(&root, &[root.join("listed")]);
    fs::remove_dir_all(&root).unwrap();
    assert_eq!(found, ["Another", "new-mod"]);
}
