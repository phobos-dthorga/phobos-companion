use super::*;
use serde_json::json;

fn manifest(surface: &str, options: Value) -> Value {
    json!({"data": {"commands": [
        {"name": "game-patches", "game": "g", "reports": [
            {"name": "summary", "effect": "reads", "question": "How much?", "options": []},
            {"name": "targets", "effect": "reads", "surface": surface, "options": options},
        ]},
        {"name": "other-patches", "game": "other", "reports": [
            {"name": "summary", "effect": "reads", "question": "Other?", "options": []},
        ]},
    ]}})
}

fn options() -> Value {
    json!([
        {"name": "--root", "kind": "text", "required": false},
        {"name": "--updates", "kind": "flag", "required": false},
        {"name": "--json", "kind": "flag", "required": false},
    ])
}

#[test]
fn the_patch_targets_reader_runs_with_the_update_compared() {
    let arguments = plan(&manifest("patch-targets", options()), "g", Path::new("repo")).unwrap();
    assert_eq!(arguments, ["game-patches", "targets", "--root", "repo", "--updates", "--json"]);
}

#[test]
fn a_game_without_one_is_told_so() {
    assert!(plan(&manifest("patch-targets", options()), "other", Path::new("repo")).is_none());
    assert!(plan(&manifest("something-else", options()), "g", Path::new("repo")).is_none());
}

#[test]
fn a_reader_missing_an_option_the_page_needs_never_runs() {
    let old = json!([{"name": "--root", "kind": "text", "required": false}]);
    assert!(plan(&manifest("patch-targets", old), "g", Path::new("repo")).is_none());
}
