use super::*;
use serde_json::json;

fn manifest(search_effect: &str, thing_surface: &str) -> Value {
    json!({"data": {"commands": [
        {"name": "game-save", "game": "g", "reports": [
            {"name": "summary", "effect": "reads", "question": "What's in it?"},
            {"name": "schema", "effect": "reads", "surface": "save"},
            {"name": "search", "effect": search_effect, "surface": "save"},
            {"name": "thing", "effect": "reads", "surface": thing_surface},
        ]},
        {"name": "other-save", "game": "other", "reports": [
            {"name": "search", "effect": "reads"},
        ]},
    ]}})
}

#[test]
fn saves_are_read_through_their_surface_never_by_the_games_name() {
    assert_eq!(tool_of(&manifest("reads", "save"), "g").as_deref(), Some("game-save"));
    assert_eq!(tool_of(&manifest("reads", "save"), "other"), None);
    assert_eq!(checked(&manifest("reads", "save"), "g", "thing").unwrap(), "game-save");
    assert!(checked(&manifest("writes", "save"), "g", "search").is_err());
    assert!(checked(&manifest("reads", "globe"), "g", "thing").is_err());
    assert!(checked(&manifest("reads", "save"), "g", "summary").is_err());
}

#[test]
fn a_saves_name_is_never_a_path_or_an_option() {
    assert!(save_name("PG16"));
    assert!(save_name("Colony 1"));
    for bad in ["", "-x", "../PG16", "C:\\Saves\\PG16", "a/b", ".hidden", "two\nlines"] {
        assert!(!save_name(bad), "{bad}");
    }
}

#[test]
fn a_part_and_an_id_have_the_kits_shapes() {
    assert!(place("savegame/game/maps/li"));
    assert!(!place("/savegame"));
    assert!(!place("savegame//game"));
    assert!(!place("savegame/game/"));
    assert!(!place("--under=x"));
    assert!(!place("a b"));
    assert!(thing_id("VVE_Dirtbike30494987"));
    assert!(!thing_id("--json"));
    assert!(!thing_id("Human 200"));
    assert!(!thing_id("*"));
}

#[test]
fn typed_words_are_one_argument_or_come_after_the_double_dash() {
    assert_eq!(
        schema_arguments("game-save", Some("PG16"), Some("savegame/game")).unwrap(),
        ["game-save", "schema", "--depth", "1", "--top", "300", "--save=PG16", "--under=savegame/game", "--json"]
    );
    assert_eq!(
        schema_arguments("game-save", None, None).unwrap(),
        ["game-save", "schema", "--depth", "1", "--top", "300", "--json"]
    );
    assert_eq!(
        search_arguments("game-save", None, "--rebuild").unwrap(),
        ["game-save", "search", "--top", "60", "--json", "--", "--rebuild"]
    );
    assert_eq!(
        thing_arguments("game-save", Some("Colony 1"), "Human200").unwrap(),
        ["game-save", "thing", "--top", "400", "--save=Colony 1", "--json", "--", "Human200"]
    );
    assert!(search_arguments("game-save", None, "   ").is_err());
    assert!(thing_arguments("game-save", None, "Human200;rm").is_err());
    assert!(schema_arguments("game-save", Some("../x"), None).is_err());
}

#[test]
fn the_command_line_is_as_a_person_would_type_it() {
    let arguments = thing_arguments("game-save", None, "Human200").unwrap();
    assert_eq!(command_line(&arguments), "python -m phobos_modkit game-save thing --top 400 -- Human200");
}
