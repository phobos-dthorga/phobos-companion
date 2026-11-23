use super::*;
use serde_json::json;

#[test]
fn each_question_becomes_one_checked_run() {
    let root = Path::new("repo");
    assert_eq!(arguments(root, &Question::Summary).unwrap(), ["connections", "summary", "--root", "repo", "--json"]);
    assert_eq!(
        arguments(root, &Question::Around("cs:Sample.Boat.Tick".to_owned())).unwrap(),
        ["connections", "around", "--root", "repo", "--node=cs:Sample.Boat.Tick", "--json"]
    );
    assert_eq!(
        arguments(root, &Question::Flow("lua:Lamps.light".to_owned(), 3)).unwrap(),
        ["connections", "flow", "--root", "repo", "--node=lua:Lamps.light", "--depth", "3", "--json"]
    );
    assert_eq!(
        arguments(root, &Question::Find(" *Tick* ".to_owned())).unwrap(),
        ["connections", "find", "--root", "repo", "--name=*Tick*", "--top", "80", "--json"]
    );
    assert_eq!(
        arguments(root, &Question::Changed("401c6a93".to_owned())).unwrap(),
        ["connections", "changed", "--root", "repo", "--commit=401c6a93", "--json"]
    );
}

#[test]
fn a_malformed_question_never_runs() {
    let root = Path::new("repo");
    assert!(arguments(root, &Question::Around("--all".to_owned())).is_err());
    assert!(arguments(root, &Question::History("--all".to_owned())).is_err());
    assert_eq!(
        arguments(root, &Question::History("lua:Lamps.shine".to_owned())).unwrap(),
        ["connections", "history", "--root", "repo", "--node=lua:Lamps.shine", "--limit", "200", "--json"]
    );
    assert!(arguments(root, &Question::Flow("cs:A".to_owned(), 9)).is_err());
    assert!(arguments(root, &Question::Find("a\nb".to_owned())).is_err());
    assert!(arguments(root, &Question::Changed("HEAD~1".to_owned())).is_err());
    assert!(question("delete", None, None, None).is_err());
    assert!(question("around", None, None, None).is_err());
    assert_eq!(question("flow", Some("cs:A".to_owned()), None, None).unwrap(), Question::Flow("cs:A".to_owned(), 2));
}

#[test]
fn names_are_asked_of_one_c_sharp_file_and_a_commit_only() {
    let root = Path::new("repo");
    let names = |file: &str, commit: Option<&str>| {
        arguments(root, &Question::Names(file.to_owned(), commit.map(str::to_owned)))
    };
    assert_eq!(
        names("src/Mod/Sail.cs", Some("401c6a93")).unwrap(),
        ["connections", "names", "--root", "repo", "--file=src/Mod/Sail.cs", "--commit=401c6a93", "--json"]
    );
    assert_eq!(
        names("src/Mod/Sail.cs", None).unwrap(),
        ["connections", "names", "--root", "repo", "--file=src/Mod/Sail.cs", "--json"]
    );
    for refused in ["../outside/A.cs", "/abs/A.cs", "--all.cs", "src\\A.cs", "Textures/Boat.png", "notes.md"] {
        assert!(names(refused, None).is_err(), "{refused}");
    }
    // Lua, Python and XML are read by name (kit 1.115.0).
    for by_name in ["Defs/Boats.xml", "lua/lamps.lua", "tools/keeper.py"] {
        assert!(names(by_name, None).is_ok(), "{by_name}");
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
