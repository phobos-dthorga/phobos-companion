use super::*;
use serde_json::json;

fn manifest(watch_effect: &str, mark_surface: &str) -> Value {
    json!({"data": {"commands": [
        {"name": "game-save", "game": "g", "reports": [
            {"name": "summary", "effect": "reads", "question": "What's in it?", "options": []},
        ]},
        {"name": "game-perf", "game": "g", "reports": [
            {"name": "record", "effect": "runs", "question": "What now?"},
            {"name": "watch", "effect": watch_effect, "surface": "memory-watch"},
            {"name": "watch-report", "effect": "reads", "surface": "memory-watch"},
            {"name": "watch-status", "effect": "reads", "surface": "memory-watch"},
            {"name": "watch-stop", "effect": "writes", "surface": "memory-watch"},
            {"name": "watch-mark", "effect": "writes", "surface": mark_surface},
        ]},
        {"name": "other-perf", "game": "other", "reports": [
            {"name": "record", "effect": "runs"},
        ]},
    ]}})
}

#[test]
fn the_watch_is_found_by_its_surface_never_by_the_games_name() {
    assert_eq!(tool_of(&manifest("runs", "memory-watch"), "g").as_deref(), Some("game-perf"));
    assert_eq!(tool_of(&manifest("runs", "memory-watch"), "other"), None);
}

#[test]
fn each_step_runs_only_while_the_manifest_gives_it_the_surface_and_effect() {
    let good = manifest("runs", "memory-watch");
    assert_eq!(checked(&good, "g", "watch", "runs").unwrap(), "game-perf");
    assert_eq!(checked(&good, "g", "watch-mark", "writes").unwrap(), "game-perf");
    assert!(checked(&manifest("owner-only", "memory-watch"), "g", "watch", "runs").is_err());
    assert!(checked(&manifest("runs", "other"), "g", "watch-mark", "writes").is_err());
    assert!(checked(&good, "other", "watch-status", "reads").is_err());
}

#[test]
fn a_watch_is_named_as_the_kit_names_it() {
    assert!(watch_id("20261119-205419"));
    assert!(watch_id("20261119-205419-reload-test-2"));
    assert!(!watch_id("20261119-205419-"));
    assert!(!watch_id("--json"));
    assert!(!watch_id("20261119-205419-Reload"));
    assert!(!watch_id("20261119-205419-ü"));
    assert!(!watch_id("20261119-205419/../x"));
    assert!(!watch_id(&format!("20261119-205419-{}", "a".repeat(60))));
}

#[test]
fn reading_names_the_watch_or_takes_the_running_one() {
    assert_eq!(status_arguments("game-perf", None), ["game-perf", "watch-status", "--json"]);
    assert_eq!(
        status_arguments("game-perf", Some("20261119-205419")),
        ["game-perf", "watch-status", "20261119-205419", "--json"]
    );
}

#[test]
fn a_watch_starts_only_for_an_offered_length_with_the_label_as_one_argument() {
    assert_eq!(
        start_arguments("game-perf", 15, true, "  reload\n test ").unwrap(),
        ["game-perf", "watch", "--minutes", "15", "--label=reload test", "--json"]
    );
    assert_eq!(
        start_arguments("game-perf", 5, false, "").unwrap(),
        ["game-perf", "watch", "--minutes", "5", "--no-counters", "--json"]
    );
    assert!(start_arguments("game-perf", 7, true, "").is_err());
    assert!(start_arguments("game-perf", 15, true, &"x".repeat(81)).is_err());
}

#[test]
fn a_marks_words_come_last_and_can_never_be_an_option() {
    assert_eq!(
        mark_arguments("game-perf", None, "--minutes 999", Some(1_795_000_000.5)).unwrap(),
        ["game-perf", "watch-mark", "--at", "1795000000.500", "--json", "--", "--minutes 999"]
    );
    assert_eq!(
        mark_arguments("game-perf", Some("20261119-205419"), "reloading now", None).unwrap(),
        ["game-perf", "watch-mark", "--watch=20261119-205419", "--json", "--", "reloading now"]
    );
    assert!(mark_arguments("game-perf", None, "   ", None).is_err());
    assert!(mark_arguments("game-perf", None, &"x".repeat(201), None).is_err());
    assert!(mark_arguments("game-perf", None, "ok", Some(f64::NAN)).is_err());
}

#[test]
fn the_command_line_is_as_a_person_would_type_it() {
    let arguments = start_arguments("game-perf", 15, true, "").unwrap();
    assert_eq!(command_line(&arguments), "python -m phobos_modkit game-perf watch --minutes 15");
}
