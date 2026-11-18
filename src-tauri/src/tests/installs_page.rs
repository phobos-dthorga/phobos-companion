use super::*;
use serde_json::json;

fn manifest(effect: &str) -> Value {
    json!({"data": {"commands": [
        {"name": "installs", "game": null, "reports": [
            {"name": "status", "effect": "reads"},
            {"name": "backup", "effect": effect},
            {"name": "restore", "effect": effect},
            {"name": "install", "effect": "runs"},
            {"name": "build", "effect": "runs"}
        ]},
        {"name": "sample-textures", "game": "sample", "reports": [
            {"name": "status", "effect": "reads", "surface": "textures"},
            {"name": "encode", "effect": effect}
        ]}
    ]}})
}

fn names(list: &[&str]) -> Vec<String> {
    list.iter().map(|s| (*s).to_owned()).collect()
}

#[test]
fn moves_run_only_while_the_kit_says_they_write_or_run() {
    for action in ["backup", "restore", "install", "build"] {
        assert!(allowed_by_manifest(&manifest("writes"), "installs", action).is_ok(), "{action}");
    }
    assert!(allowed_by_manifest(&manifest("writes"), "installs", "status").is_err());
    assert!(allowed_by_manifest(&manifest("writes"), "installs", "delete").is_err());
    assert!(allowed_by_manifest(&manifest("owner-only"), "installs", "backup").is_err());
    assert!(allowed_by_manifest(&manifest("owner-only"), "sample-textures", "encode").is_err());
    assert!(allowed_by_manifest(&json!({"data": {"commands": []}}), "installs", "backup").is_err());
}

#[test]
fn each_move_takes_the_mods_it_needs_and_no_others() {
    let root = Path::new("repo");
    let restore = move_arguments(root, "restore", &names(&["Thing"]), Some("Thing-20261118-200751")).unwrap();
    assert_eq!(
        restore,
        ["installs", "restore", "--root", "repo", "--mod", "Thing", "--backup", "Thing-20261118-200751", "--json"]
    );
    let install = move_arguments(root, "install", &names(&["Thing", "Other"]), None).unwrap();
    assert_eq!(install, ["installs", "install", "--root", "repo", "--mod", "Thing", "--mod", "Other", "--json"]);
    assert_eq!(move_arguments(root, "build", &[], None).unwrap(), ["installs", "build", "--root", "repo", "--json"]);
    assert!(move_arguments(root, "build", &names(&["Thing"]), None).is_err());
    assert!(move_arguments(root, "install", &[], None).is_err());
    assert!(move_arguments(root, "backup", &names(&["Thing", "Other"]), None).is_err());
    assert!(move_arguments(root, "restore", &names(&["Thing"]), None).is_err());
    assert!(move_arguments(root, "restore", &names(&["Thing"]), Some("../Thing")).is_err());
    assert!(move_arguments(root, "install", &names(&["Thing"]), Some("Thing-1")).is_err());
    assert!(move_arguments(root, "install", &names(&["-Thing"]), None).is_err());
}

#[test]
fn the_texture_check_is_found_through_the_manifest_never_by_name() {
    assert_eq!(textures_command(&manifest("writes"), "sample").as_deref(), Some("sample-textures"));
    assert_eq!(textures_command(&manifest("writes"), "other"), None);
}

#[test]
fn settings_are_passed_only_when_a_repository_names_them() {
    let none = with_settings(vec!["t".to_owned(), "status".to_owned()], None);
    assert_eq!(none, ["t", "status", "--json"]);
    let some = with_settings(vec!["t".to_owned()], Some(PathBuf::from("s.json")));
    assert_eq!(some, ["t", "--settings", "s.json", "--json"]);
}

#[test]
fn a_refusal_comes_back_in_words() {
    let answer = json!({"report": {"title": "Refused"}, "data": {"ok": false, "refusal": "The game is running."}});
    let result = result_of(&answer);
    assert!(!result.ok);
    assert_eq!(result.refusal.as_deref(), Some("The game is running."));
    assert!(Outcome::required(&answer).is_err());
    let done = result_of(&json!({"report": {"title": "Backed up Thing"}, "data": {"ok": true, "backup": "Thing-1"}}));
    assert!(done.ok);
    assert_eq!(done.title, "Backed up Thing");
}

#[test]
fn status_reads_the_repository_it_is_given() {
    assert_eq!(status_arguments(Path::new("repo")), ["installs", "status", "--root", "repo", "--json"]);
}
