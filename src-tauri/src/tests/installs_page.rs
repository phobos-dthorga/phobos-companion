use super::*;
use serde_json::json;

fn manifest(effect: &str) -> Value {
    json!({"data": {"commands": [{"name": "installs", "reports": [
        {"name": "status", "effect": "reads"},
        {"name": "backup", "effect": effect},
        {"name": "restore", "effect": effect},
        {"name": "install", "effect": "runs"}
    ]}]}})
}

#[test]
fn only_the_three_moves_are_made_and_only_while_the_kit_says_they_write_or_run() {
    assert!(allowed_by_manifest(&manifest("writes"), "backup").is_ok());
    assert!(allowed_by_manifest(&manifest("writes"), "restore").is_ok());
    assert!(allowed_by_manifest(&manifest("writes"), "install").is_ok());
    assert!(allowed_by_manifest(&manifest("writes"), "status").is_err());
    assert!(allowed_by_manifest(&manifest("writes"), "delete").is_err());
    assert!(allowed_by_manifest(&manifest("owner-only"), "backup").is_err());
    assert!(allowed_by_manifest(&json!({"data": {"commands": []}}), "backup").is_err());
}

#[test]
fn names_are_plain_folder_names() {
    assert!(plain_name("PhobosFramework"));
    assert!(plain_name("PhobosFramework-20261118-200751"));
    assert!(!plain_name(""));
    assert!(!plain_name("--apply"));
    assert!(!plain_name(".."));
    assert!(!plain_name("Mods/Other"));
    assert!(!plain_name("a b"));
    assert!(!plain_name(&"x".repeat(MAX_NAME + 1)));
}

#[test]
fn a_move_names_its_mod_and_only_restore_takes_a_backup() {
    let root = Path::new("repo");
    let restore = move_arguments(root, "restore", "Thing", Some("Thing-20261118-200751")).unwrap();
    assert_eq!(
        restore,
        ["installs", "restore", "--root", "repo", "--mod", "Thing", "--backup", "Thing-20261118-200751", "--json"]
    );
    assert_eq!(move_arguments(root, "backup", "Thing", None).unwrap()[1], "backup");
    assert!(move_arguments(root, "restore", "Thing", None).is_err());
    assert!(move_arguments(root, "restore", "Thing", Some("../Thing")).is_err());
    assert!(move_arguments(root, "install", "Thing", Some("Thing-20261118-200751")).is_err());
    assert!(move_arguments(root, "install", "-Thing", None).is_err());
}

#[test]
fn a_refusal_comes_back_in_words() {
    let answer = json!({"report": {"title": "Refused"}, "data": {"ok": false, "refusal": "The game is running."}});
    let result = result_of(&answer);
    assert!(!result.ok);
    assert_eq!(result.refusal.as_deref(), Some("The game is running."));
    let done = result_of(&json!({"report": {"title": "Backed up Thing"}, "data": {"ok": true, "backup": "Thing-1"}}));
    assert!(done.ok);
    assert_eq!(done.title, "Backed up Thing");
}

#[test]
fn status_reads_the_repository_it_is_given() {
    let arguments = status_arguments(Path::new("repo"));
    assert_eq!(arguments, ["installs", "status", "--root", "repo", "--json"]);
}
