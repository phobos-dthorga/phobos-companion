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
