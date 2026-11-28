use super::*;
use serde_json::json;

fn manifest(record_effect: &str, report_surface: &str) -> Value {
    json!({"data": {"commands": [
        {"name": "game-save", "game": "g", "reports": [
            {"name": "summary", "effect": "reads", "question": "What's in it?", "options": []},
        ]},
        {"name": "game-perf", "game": "g", "reports": [
            {"name": "report", "effect": "reads", "surface": report_surface},
            {"name": "record", "effect": record_effect, "surface": "performance"},
            {"name": "list", "effect": "reads", "surface": "performance"},
            {"name": "callers", "effect": "reads", "surface": "performance"},
            {"name": "mod", "effect": "reads", "surface": "performance"},
            {"name": "compare", "effect": "reads", "surface": "performance"},
            {"name": "trend", "effect": "reads", "surface": "performance"},
            {"name": "costs", "effect": "reads", "surface": "performance"},
            {"name": "watch", "effect": "runs", "surface": "memory-watch"},
        ]},
        {"name": "other-perf", "game": "other", "reports": [
            {"name": "report", "effect": "reads"},
        ]},
    ]}})
}

#[test]
fn recordings_are_found_by_their_surface_never_by_the_games_name() {
    assert_eq!(tool_of(&manifest("runs", "performance"), "g").as_deref(), Some("game-perf"));
    assert_eq!(tool_of(&manifest("runs", "performance"), "other"), None);
    assert_eq!(tool_of(&manifest("runs", "memory-watch"), "g"), None);
}

#[test]
fn each_report_runs_only_while_the_manifest_gives_it_the_surface_and_effect() {
    let good = manifest("runs", "performance");
    assert_eq!(checked(&good, "g", "record", "runs").unwrap(), "game-perf");
    assert_eq!(checked(&good, "g", "callers", "reads").unwrap(), "game-perf");
    assert_eq!(checked(&good, "g", "costs", "reads").unwrap(), "game-perf");
    assert!(checked(&manifest("owner-only", "performance"), "g", "record", "runs").is_err());
    assert!(checked(&good, "g", "watch", "runs").is_err());
    assert!(checked(&good, "other", "report", "reads").is_err());
}

#[test]
fn a_recording_starts_only_for_an_offered_length_with_the_label_as_one_argument() {
    assert_eq!(
        record_arguments("game-perf", 30, false, "  many\n wounded ").unwrap(),
        ["game-perf", "record", "--seconds", "30", "--top", "15", "--label=many wounded", "--json"]
    );
    assert_eq!(
        record_arguments("game-perf", 15, true, "").unwrap(),
        ["game-perf", "record", "--seconds", "15", "--top", "15", "--alloc", "--json"]
    );
    assert!(record_arguments("game-perf", 45, false, "").is_err());
    assert!(record_arguments("game-perf", 30, false, &"x".repeat(81)).is_err());
}

#[test]
fn names_come_last_and_can_never_be_an_option() {
    let recording = "20261118-081449-after-engine-loads";
    assert_eq!(
        look_arguments("game-perf", recording, &Look::Callers { method: "GenTypes.IsSealedWithCache".into() }).unwrap(),
        ["game-perf", "callers", "--top", "15", "--json", "--", "GenTypes.IsSealedWithCache", recording]
    );
    assert_eq!(
        look_arguments("game-perf", recording, &Look::Mod { name: "The Dead Man's Switch - Legion".into() }).unwrap(),
        ["game-perf", "mod", "--top", "15", "--json", "--", "The Dead Man's Switch - Legion", recording]
    );
    assert!(look_arguments("game-perf", recording, &Look::Callers { method: "--all-threads".into() }).is_err());
    assert!(look_arguments("game-perf", recording, &Look::Callers { method: "A;B".into() }).is_err());
    assert!(look_arguments("game-perf", recording, &Look::Mod { name: "--top=9".into() }).is_err());
    assert!(look_arguments("game-perf", recording, &Look::Mod { name: "two\nlines".into() }).is_err());
}

#[test]
fn a_comparison_puts_the_earlier_recording_first() {
    let later = "20261118-081449-after";
    let earlier = "20261118-011554-before";
    assert_eq!(
        look_arguments("game-perf", later, &Look::Compare { other: earlier.into() }).unwrap(),
        ["game-perf", "compare", "--top", "15", "--json", "--", earlier, later]
    );
    assert_eq!(
        look_arguments("game-perf", earlier, &Look::Compare { other: later.into() }).unwrap(),
        ["game-perf", "compare", "--top", "15", "--json", "--", earlier, later]
    );
    assert!(look_arguments("game-perf", later, &Look::Compare { other: later.into() }).is_err());
    assert!(look_arguments("game-perf", later, &Look::Compare { other: "../x".into() }).is_err());
    assert_eq!(
        look_arguments("game-perf", later, &Look::Trend).unwrap(),
        ["game-perf", "trend", "--top", "15", "--json"]
    );
}

#[test]
fn a_recording_is_named_as_the_kit_names_it() {
    assert!(checked_recording("20261117-190038-many-wounded").is_ok());
    assert!(checked_recording("20261117-190038").is_ok());
    assert!(checked_recording("--json").is_err());
    assert!(checked_recording("20261117-190038-Many").is_err());
}

#[test]
fn a_mods_name_is_one_plain_line() {
    assert!(mod_name("D'thorga Medical"));
    assert!(mod_name("Smart Medicine - Continued"));
    assert!(!mod_name(" padded"));
    assert!(!mod_name("-x"));
    assert!(!mod_name(&"x".repeat(121)));
}

#[test]
fn the_command_line_is_as_a_person_would_type_it() {
    let arguments = record_arguments("game-perf", 30, false, "").unwrap();
    assert_eq!(command_line(&arguments), "python -m phobos_modkit game-perf record --seconds 30 --top 15");
}
