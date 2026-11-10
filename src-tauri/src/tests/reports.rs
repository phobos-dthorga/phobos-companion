use super::*;
use serde_json::json;

fn read_report(name: &str, question: Option<&str>) -> Value {
    json!({"name": name, "effect": "reads", "question": question, "options": [
        {"name": "--json", "kind": "flag", "required": false},
        {"name": "--top", "kind": "integer", "required": false},
    ]})
}

fn manifest() -> Value {
    json!({"data": {"commands": [
        {"name": "game-save", "game": "g", "reports": [
            read_report("summary", Some("What's in my save?")),
            read_report("schema", None),
            {"name": "atlas", "effect": "reads", "question": "What does it look like?", "surface": "globe",
             "options": []},
            {"name": "find", "effect": "reads", "question": "Find it?", "options": [
                {"name": "term", "kind": "text", "required": true},
            ]},
            {"name": "snapshot", "effect": "writes", "question": "Write it?", "options": []},
            {"name": "online", "effect": "reads-online", "question": "Look it up?", "options": []},
            {"name": "upload", "effect": "owner-only", "question": "Upload it?", "options": []},
        ]},
        {"name": "game-log", "game": "g", "reports": [
            {"name": null, "effect": "reads", "question": "Why?", "options": [
                {"name": "--json", "kind": "text", "required": false},
            ]},
        ]},
        {"name": "other-save", "game": "other", "reports": [read_report("summary", Some("Other?"))]},
        {"name": "core", "game": null, "reports": [read_report("summary", Some("Core?"))]},
    ]}})
}

fn code(result: Result<&[Value], Failure>) -> FailureCode {
    result.unwrap_err().code
}

#[test]
fn offers_only_reading_reports_with_a_question_and_nothing_to_type() {
    let found = entries(&manifest(), "g");
    let names: Vec<_> = found.iter().map(|e| (e.command.as_str(), e.report.as_deref())).collect();
    assert_eq!(names, [("game-save", Some("summary")), ("game-save", Some("atlas")), ("game-log", None)]);
    assert_eq!(found[0].question, "What's in my save?");
}

#[test]
fn says_which_report_wants_a_page_of_its_own() {
    let found = entries(&manifest(), "g");
    let surfaces: Vec<_> = found.iter().map(|e| e.surface.as_deref()).collect();
    assert_eq!(surfaces, [None, Some("globe"), None]);
}

#[test]
fn a_game_with_no_tools_has_no_reports() {
    assert!(entries(&manifest(), "nothing").is_empty());
}

#[test]
fn refuses_what_it_would_not_offer() {
    let manifest = manifest();
    for report in ["snapshot", "online", "upload", "find", "schema", "not-there"] {
        assert_eq!(code(find_runnable(&manifest, "g", "game-save", Some(report))), FailureCode::Refused, "{report}");
    }
}

#[test]
fn refuses_another_games_report_and_core_commands() {
    let manifest = manifest();
    assert_eq!(code(find_runnable(&manifest, "g", "other-save", Some("summary"))), FailureCode::Refused);
    assert_eq!(code(find_runnable(&manifest, "g", "core", Some("summary"))), FailureCode::Refused);
    assert_eq!(code(find_runnable(&manifest, "g", "nope", None)), FailureCode::Refused);
}

#[test]
fn allows_what_it_offers() {
    let manifest = manifest();
    assert!(find_runnable(&manifest, "g", "game-save", Some("summary")).is_ok());
    assert!(find_runnable(&manifest, "g", "game-log", None).is_ok());
}

#[test]
fn builds_the_arguments_from_the_manifest() {
    let manifest = manifest();
    let options = find_runnable(&manifest, "g", "game-save", Some("summary")).unwrap();
    assert_eq!(
        arguments("game-save", Some("summary"), options, 100),
        ["game-save", "summary", "--json", "--top", "100"]
    );
}

#[test]
fn a_json_option_that_takes_a_value_is_sent_to_standard_output() {
    let manifest = manifest();
    let options = find_runnable(&manifest, "g", "game-log", None).unwrap();
    assert_eq!(arguments("game-log", None, options, 100), ["game-log", "--json", "-"]);
}

#[test]
fn keeps_the_row_limit_sensible() {
    let manifest = manifest();
    let options = find_runnable(&manifest, "g", "game-save", Some("summary")).unwrap();
    assert_eq!(top_arguments(options, 999_999), ["--top", "5000"]);
    assert_eq!(top_arguments(options, 0), ["--top", "1"]);
}

#[test]
fn gives_a_command_a_person_can_paste() {
    let manifest = manifest();
    let options = find_runnable(&manifest, "g", "game-save", Some("summary")).unwrap();
    assert_eq!(
        command_line("game-save", Some("summary"), options, 100),
        "python -m phobos_modkit game-save summary --top 100"
    );
}

#[test]
fn the_pinned_kit_offers_reports_for_rimworld() {
    assert!(catalogue("rimworld").unwrap().len() >= 15);
}

/// Needs a RimWorld install, so it runs only when asked: cargo test -- --ignored
#[test]
#[ignore = "needs a real game on this PC"]
fn runs_a_real_report_on_this_pc() {
    let result = run("rimworld", "rimworld-startup", Some("summary"), 100).unwrap();
    assert!(result.report["title"].is_string());
    assert!(result.command_line.ends_with("rimworld-startup summary --top 100"));
    assert_eq!(run("rimworld", "steam-publish", Some("upload"), 100).unwrap_err().code, FailureCode::Refused);
}
