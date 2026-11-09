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
    let text = include_str!("../../../config/games.example.json");
    assert_eq!(parse(text).unwrap().len(), 2);
}
