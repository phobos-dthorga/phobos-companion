use super::*;
use serde_json::json;

const GAME: &str = "rimworld";

#[test]
fn each_question_becomes_one_checked_run_with_the_game_named() {
    let root = Path::new("repo");
    assert_eq!(
        arguments(root, GAME, &Question::Summary).unwrap(),
        ["connections", "summary", "--root", "repo", "--game=rimworld", "--json"]
    );
    assert_eq!(
        arguments(root, GAME, &Question::Around("cs:Sample.Boat.Tick".to_owned())).unwrap(),
        ["connections", "around", "--root", "repo", "--node=cs:Sample.Boat.Tick", "--game=rimworld", "--json"]
    );
    assert_eq!(
        arguments(root, GAME, &Question::Flow("lua:Lamps.light".to_owned(), 3)).unwrap(),
        [
            "connections",
            "flow",
            "--root",
            "repo",
            "--node=lua:Lamps.light",
            "--depth",
            "3",
            "--game=rimworld",
            "--json"
        ]
    );
    assert_eq!(
        arguments(root, GAME, &Question::Find(" *Tick* ".to_owned())).unwrap(),
        ["connections", "find", "--root", "repo", "--name=*Tick*", "--top", "80", "--game=rimworld", "--json"]
    );
    assert_eq!(
        arguments(root, GAME, &Question::Changed("401c6a93".to_owned())).unwrap(),
        ["connections", "changed", "--root", "repo", "--commit=401c6a93", "--game=rimworld", "--json"]
    );
    // A thing a game's data files declare (0.83.0; kit 1.117.0): a translation key is a thing like any other.
    assert_eq!(
        arguments(root, "ostranauts", &Question::Around("data:key/PhobosBank/Plugin.loaded".to_owned())).unwrap(),
        [
            "connections",
            "around",
            "--root",
            "repo",
            "--node=data:key/PhobosBank/Plugin.loaded",
            "--game=ostranauts",
            "--json"
        ]
    );
}

#[test]
fn a_malformed_question_never_runs() {
    let root = Path::new("repo");
    assert!(arguments(root, GAME, &Question::Around("--all".to_owned())).is_err());
    assert!(arguments(root, GAME, &Question::History("--all".to_owned())).is_err());
    assert_eq!(
        arguments(root, GAME, &Question::History("lua:Lamps.shine".to_owned())).unwrap(),
        [
            "connections",
            "history",
            "--root",
            "repo",
            "--node=lua:Lamps.shine",
            "--limit",
            "200",
            "--game=rimworld",
            "--json"
        ]
    );
    assert!(arguments(root, GAME, &Question::Flow("cs:A".to_owned(), 9)).is_err());
    assert!(arguments(root, GAME, &Question::Find("a\nb".to_owned())).is_err());
    assert!(arguments(root, GAME, &Question::Changed("HEAD~1".to_owned())).is_err());
    assert!(arguments(root, "--all", &Question::Summary).is_err(), "a game that is not one never reaches the tools");
    assert!(question("delete", None, None, None).is_err());
    assert!(question("around", None, None, None).is_err());
    assert_eq!(question("flow", Some("cs:A".to_owned()), None, None).unwrap(), Question::Flow("cs:A".to_owned(), 2));
}

#[test]
fn calls_are_asked_of_one_commit() {
    let root = Path::new("repo");
    assert_eq!(
        question("calls", Some("5c122faf".to_owned()), None, None).unwrap(),
        Question::Calls("5c122faf".to_owned())
    );
    assert_eq!(
        arguments(root, GAME, &Question::Calls("5c122faf".to_owned())).unwrap(),
        ["connections", "calls", "--root", "repo", "--commit=5c122faf", "--game=rimworld", "--json"]
    );
    assert!(arguments(root, GAME, &Question::Calls("HEAD~1".to_owned())).is_err());
    assert!(arguments(root, "--all", &Question::Calls("5c122faf".to_owned())).is_err());
    assert!(question("calls", None, None, None).is_err());
}

#[test]
fn names_are_asked_of_one_file_whose_names_are_read_and_a_commit_only() {
    let root = Path::new("repo");
    let names = |file: &str, commit: Option<&str>| {
        arguments(root, GAME, &Question::Names(file.to_owned(), commit.map(str::to_owned)))
    };
    assert_eq!(
        names("src/Mod/Sail.cs", Some("401c6a93")).unwrap(),
        [
            "connections",
            "names",
            "--root",
            "repo",
            "--file=src/Mod/Sail.cs",
            "--commit=401c6a93",
            "--game=rimworld",
            "--json"
        ]
    );
    assert_eq!(
        names("src/Mod/Sail.cs", None).unwrap(),
        ["connections", "names", "--root", "repo", "--file=src/Mod/Sail.cs", "--game=rimworld", "--json"]
    );
    for refused in ["../outside/A.cs", "/abs/A.cs", "--all.cs", "src\\A.cs", "Textures/Boat.png", "notes.md"] {
        assert!(names(refused, None).is_err(), "{refused}");
    }
    // Lua, Python and XML are read by name (kit 1.115.0); a data file by the rules of the game's table (kit 1.117.0).
    for read in ["Defs/Boats.xml", "lua/lamps.lua", "tools/keeper.py", "mods/Alpha/framework/recipes.json"] {
        assert!(names(read, None).is_ok(), "{read}");
    }
    assert!(names("src/A.cs", Some("HEAD~1")).is_err());
    assert_eq!(
        question("names", Some("src/A.cs".to_owned()), None, Some("401c6a93".to_owned())).unwrap(),
        Question::Names("src/A.cs".to_owned(), Some("401c6a93".to_owned()))
    );
}

#[test]
fn a_refusal_comes_back_in_words() {
    let refused =
        answer_of(&json!({"data": {"ok": false, "refusal": "'cs:Nothing' is not in this repository's connections."}}));
    assert!(!refused.ok);
    assert!(refused.refusal.unwrap().contains("not in this repository"));
    assert!(answer_of(&json!({"data": {"groups": []}})).ok);
}
