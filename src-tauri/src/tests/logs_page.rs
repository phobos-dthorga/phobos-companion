use super::*;
use serde_json::json;

fn manifest(log_options: Value) -> Value {
    json!({"data": {"commands": [
        {"name": "game-save", "game": "g", "reports": [
            {"name": "summary", "effect": "reads", "question": "What's in it?", "options": []},
        ]},
        {"name": "game-log", "game": "g", "reports": [
            {"name": null, "effect": "reads", "question": "Why?", "surface": "log", "options": log_options},
        ]},
        {"name": "other-save", "game": "other", "reports": [
            {"name": "summary", "effect": "reads", "question": "Other?", "options": []},
        ]},
    ]}})
}

fn full_options() -> Value {
    json!([
        {"name": "--json", "kind": "text", "required": false},
        {"name": "--top", "kind": "integer", "required": false},
        {"name": "--brief", "kind": "flag", "required": false},
    ])
}

#[test]
fn the_log_reader_runs_brief_with_a_pages_worth() {
    let (arguments, command_line) = plan(&manifest(full_options()), "g").unwrap().unwrap();
    assert_eq!(arguments, ["game-log", "--json", "-", "--top", "60", "--brief"]);
    assert_eq!(command_line, "python -m phobos_modkit game-log --top 60");
}

#[test]
fn a_game_without_a_log_reader_is_told_so() {
    assert!(plan(&manifest(full_options()), "other").unwrap().is_none());
}

#[test]
fn an_old_kit_without_brief_is_refused_in_words() {
    let old = json!([{"name": "--json", "kind": "text", "required": false}]);
    let refused = plan(&manifest(old), "g").unwrap_err();
    assert!(refused.detail.contains("1.35.0"), "{}", refused.detail);
}

#[test]
fn a_log_reader_that_needs_typing_never_runs() {
    let typed = json!([
        {"name": "log", "kind": "text", "required": true},
        {"name": "--brief", "kind": "flag", "required": false},
    ]);
    assert!(plan(&manifest(typed), "g").unwrap().is_none());
}
