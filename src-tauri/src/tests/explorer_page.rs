use super::*;
use serde_json::json;
use std::io::Cursor;

fn manifest(effect: &str) -> Value {
    json!({"data": {"commands": [
        {"name": "game-perf", "game": "g", "reports": [
            {"name": "watch", "effect": "runs", "surface": "memory-watch"},
            {"name": "look", "effect": "runs", "surface": "look-inside", "question": "What is in memory?"},
            {"name": "look-serve", "effect": effect, "surface": "look-inside"},
        ]},
        {"name": "other-perf", "game": "other", "reports": [
            {"name": "watch", "effect": "runs", "surface": "memory-watch"},
        ]},
    ]}})
}

#[test]
fn the_reader_is_found_by_its_surface_and_runs_only_while_the_manifest_says_runs() {
    assert_eq!(tool_of(&manifest("runs"), "g").unwrap().as_deref(), Some("game-perf"));
    assert_eq!(tool_of(&manifest("runs"), "other").unwrap(), None);
    assert_eq!(tool_of(&manifest("owner-only"), "g").unwrap_err().code, FailureCode::Refused);
    assert_eq!(tool_of(&manifest("reads"), "g").unwrap_err().code, FailureCode::Refused);
}

#[test]
fn a_snapshot_is_held_for_ten_minutes_at_most_with_the_label_as_one_argument() {
    assert_eq!(serve_arguments("game-perf", "").unwrap(), ["game-perf", "look-serve", "--limit-seconds", "600"]);
    assert_eq!(
        serve_arguments("game-perf", "  day\n40 --pid 1 ").unwrap(),
        ["game-perf", "look-serve", "--limit-seconds", "600", "--label=day 40 --pid 1"]
    );
    assert!(serve_arguments("game-perf", &"x".repeat(81)).is_err());
    let arguments = serve_arguments("game-perf", "").unwrap();
    assert_eq!(command_line(&arguments), "python -m phobos_modkit game-perf look-serve --limit-seconds 600");
}

fn with_check(effect: &str) -> Value {
    let mut manifest = manifest("runs");
    manifest["data"]["commands"][0]["reports"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name": "look-check", "effect": effect, "surface": "look-inside"}));
    manifest
}

#[test]
fn the_frozen_checks_are_found_by_their_surface_and_run_only_while_the_manifest_says_runs() {
    assert_eq!(frozen_tool_of(&with_check("runs"), "g").unwrap().as_deref(), Some("game-perf"));
    assert_eq!(frozen_tool_of(&manifest("runs"), "g").unwrap(), None);
    assert_eq!(frozen_tool_of(&with_check("runs"), "other").unwrap(), None);
    assert_eq!(frozen_tool_of(&with_check("reads"), "g").unwrap_err().code, FailureCode::Refused);
    assert_eq!(frozen_tool_of(&with_check("owner-only"), "g").unwrap_err().code, FailureCode::Refused);
}

#[test]
fn the_frozen_checks_take_nothing_from_the_window() {
    let arguments = frozen_arguments("game-perf");
    assert_eq!(arguments, ["game-perf", "look-check", "--freeze", "--json"]);
    assert_eq!(command_line(&arguments), "python -m phobos_modkit game-perf look-check --freeze --json");
}

#[test]
fn the_frozen_checks_answer_as_the_held_snapshots_checks_do_or_say_why_not() {
    let report = json!({"title": "Live checks", "facts": [], "lines": [], "blocks": [], "sections": []});
    let envelope = json!({"report": report, "data": {"checks": [{"id": "a"}], "faults": 1, "looks": 2, "waiting": 3}});
    assert_eq!(
        frozen_answer(&envelope).unwrap(),
        json!({"checks": [{"id": "a"}], "faults": 1, "looks": 2, "report": report})
    );
    let refused = json!({"report": report, "data": {"ok": false, "refusal": "RimWorld is not running."}});
    assert_eq!(frozen_answer(&refused).unwrap_err(), "RimWorld is not running.");
    assert!(frozen_answer(&json!({"report": report, "data": {}})).is_err());
}

#[test]
fn a_frozen_read_is_the_overview_one_kinds_first_page_or_the_checks_and_nothing_else() {
    let overview = checked_request(&json!({"op": "overview"})).unwrap();
    assert_eq!(
        frozen_request("game-perf", &overview).unwrap(),
        ("look", strings(&["game-perf", "look", "--freeze", "--json"]))
    );
    let kind =
        checked_request(&json!({"op": "kind", "type": "Boats.Hull", "take": 50, "sort": "size", "match": "Queen"}))
            .unwrap();
    assert_eq!(
        frozen_request("game-perf", &kind).unwrap(),
        (
            "look-kind",
            strings(&[
                "game-perf",
                "look-kind",
                "Boats.Hull",
                "--freeze",
                "--top",
                "50",
                "--largest",
                "--match=Queen",
                "--json"
            ])
        )
    );
    let checks = checked_request(&json!({"op": "checks"})).unwrap();
    assert_eq!(frozen_request("game-perf", &checks).unwrap().0, "look-check");
    let later = checked_request(&json!({"op": "kind", "type": "Boats.Hull", "skip": 50})).unwrap();
    assert!(frozen_request("game-perf", &later).unwrap_err().contains("first page"));
    for op in [json!({"op": "object", "address": "0x10"}), json!({"op": "why", "type": "Boats.Hull"})] {
        assert!(frozen_request("game-perf", &checked_request(&op).unwrap()).is_err());
    }
}

fn strings(parts: &[&str]) -> Vec<String> {
    parts.iter().map(|p| (*p).to_owned()).collect()
}

#[test]
fn the_checks_are_asked_with_nothing_from_the_window() {
    // 0.91.0: the live checks take no part from the window; anything sent with them is dropped before the reader sees it.
    assert_eq!(
        checked_request(&json!({"op": "checks", "file": "C:/elsewhere/checks.json", "paths": ["x"]})).unwrap(),
        json!({"op": "checks"})
    );
}

#[test]
fn a_request_is_rebuilt_from_its_checked_parts_alone() {
    assert_eq!(checked_request(&json!({"op": "overview", "extra": "dropped"})).unwrap(), json!({"op": "overview"}));
    assert_eq!(
        checked_request(
            &json!({"op": "kind", "type": "Verse.Pawn", "skip": 50, "take": 50, "sort": "size", "match": " Ann "})
        )
        .unwrap(),
        json!({"op": "kind", "type": "Verse.Pawn", "skip": 50, "take": 50, "sort": "size", "match": "Ann"})
    );
    assert_eq!(
        checked_request(&json!({"op": "kind", "type": "Verse.Pawn"})).unwrap(),
        json!({"op": "kind", "type": "Verse.Pawn", "skip": 0, "take": 50, "sort": "", "match": ""})
    );
    assert_eq!(
        checked_request(&json!({"op": "object", "address": "0x1629EFD6E98", "skip": 0, "take": 500})).unwrap(),
        json!({"op": "object", "address": "0x1629EFD6E98", "skip": 0, "take": 500})
    );
    assert_eq!(
        checked_request(&json!({"op": "holders", "address": "0xAB", "max": 500})).unwrap(),
        json!({"op": "holders", "address": "0xAB", "max": 500})
    );
    assert_eq!(
        checked_request(&json!({"op": "path", "address": "0xAB"})).unwrap(),
        json!({"op": "path", "address": "0xAB"})
    );
    assert_eq!(
        checked_request(&json!({"op": "why", "type": "System.Xml.XmlDocument", "sample": 20})).unwrap(),
        json!({"op": "why", "type": "System.Xml.XmlDocument", "sample": 20})
    );
}

#[test]
fn a_request_out_of_bounds_or_of_the_wrong_shape_is_refused() {
    for request in [
        json!("overview"),
        json!({}),
        json!({"op": "decompile"}),
        json!({"op": "kind"}),
        json!({"op": "kind", "type": "Verse.Pawn\n"}),
        json!({"op": "kind", "type": "Verse.Pawn", "take": 0}),
        json!({"op": "kind", "type": "Verse.Pawn", "take": 501}),
        json!({"op": "kind", "type": "Verse.Pawn", "skip": 1_000_001}),
        json!({"op": "kind", "type": "Verse.Pawn", "skip": -1}),
        json!({"op": "kind", "type": "Verse.Pawn", "skip": 1.5}),
        json!({"op": "kind", "type": "Verse.Pawn", "sort": "name"}),
        json!({"op": "kind", "type": "Verse.Pawn", "match": "a\nb"}),
        json!({"op": "kind", "type": "Verse.Pawn", "match": "x".repeat(81)}),
        json!({"op": "kind", "type": 7}),
        json!({"op": "object", "address": "1629EFD6E98"}),
        json!({"op": "object", "address": "0x"}),
        json!({"op": "holders", "address": "0xAB", "max": 501}),
        json!({"op": "holders", "address": "0xAB", "max": 0}),
        json!({"op": "path"}),
        json!({"op": "why", "type": "A", "sample": 21}),
        json!({"op": "why", "type": "A", "sample": 0}),
    ] {
        assert!(checked_request(&request).is_err(), "{request} should be refused");
    }
}

#[test]
fn the_deadline_counts_down_from_the_first_line_and_never_past_the_programs_limit() {
    let now = Instant::now();
    assert_eq!(deadline(&json!({"limitSeconds": 600, "ageSeconds": 0.5}), now), now + Duration::from_millis(599_500));
    assert_eq!(deadline(&json!({"limitSeconds": 3600, "ageSeconds": 0}), now), now + Duration::from_secs(600));
    assert_eq!(deadline(&json!({"limitSeconds": 60}), now), now + Duration::from_secs(60));
    assert_eq!(deadline(&json!({}), now), now + Duration::from_secs(600));
    assert_eq!(deadline(&json!({"limitSeconds": 60, "ageSeconds": 99}), now), now);
}

#[test]
fn an_answer_says_when_the_snapshot_is_no_longer_held_and_why() {
    let answered = answer_of(Reply::Answer(json!({"ok": true, "id": 1, "data": {"count": 2}})), false);
    assert_eq!(answered, Answer { ok: true, data: json!({"count": 2}), error: None, released: None });
    let refused = answer_of(Reply::Answer(json!({"ok": false, "id": 1, "error": "There is no object at 0x10"})), false);
    assert_eq!(
        (refused.ok, refused.error.as_deref(), refused.released),
        (false, Some("There is no object at 0x10"), None)
    );
    let stopped = json!({"ok": false, "id": 1, "error": "The snapshot was let go", "released": true});
    assert_eq!(answer_of(Reply::Answer(stopped.clone()), true).released.as_deref(), Some(released::LIMIT));
    assert_eq!(answer_of(Reply::Answer(stopped), false).released.as_deref(), Some(released::ENDED));
    assert_eq!(answer_of(Reply::Released("held for 600 s".into()), false).released.as_deref(), Some(released::LIMIT));
    assert_eq!(answer_of(Reply::Ended(String::new()), false), Answer::released(released::ENDED, None));
    assert_eq!(answer_of(Reply::TimedOut, false).released.as_deref(), Some(released::LIMIT));
}

/// Every step that touches the one snapshot the program holds, in one test, since the program holds one at a time.
#[test]
fn one_snapshot_is_held_at_a_time_and_a_request_for_another_is_told_it_is_gone() {
    let output = concat!(
        "{\"ok\": true, \"id\": 1, \"data\": {\"totalObjects\": 3}}\n",
        "{\"ok\": false, \"id\": 2, \"error\": \"The snapshot was let go\", \"released\": true}\n",
    );
    let served = Served::from_parts(
        None,
        Box::new(std::io::sink()),
        Cursor::new(output.as_bytes().to_vec()),
        Cursor::new(Vec::new()),
    );
    let deadline = Instant::now() + Duration::from_secs(600);
    *held() = Some(Arc::new(Held { snapshot: 41, served, deadline }));

    let overview = ask(41, &json!({"op": "overview"}), None).unwrap();
    assert_eq!((overview.ok, overview.data["totalObjects"].as_u64()), (true, Some(3)));
    assert_eq!(ask(40, &json!({"op": "overview"}), None).unwrap().released.as_deref(), Some(released::GONE));
    assert_eq!(ask(41, &json!({"op": "kind"}), None).unwrap_err().code, FailureCode::Refused);

    // The reader let go by itself: the host forgets it, and the next question is told it is gone.
    assert_eq!(ask(41, &json!({"op": "info"}), None).unwrap().released.as_deref(), Some(released::ENDED));
    assert!(current(41).is_none());
    assert_eq!(ask(41, &json!({"op": "info"}), None).unwrap().released.as_deref(), Some(released::GONE));

    // Let it go: only the snapshot named, and only once.
    let quiet = Served::from_parts(None, Box::new(std::io::sink()), Cursor::new(Vec::new()), Cursor::new(Vec::new()));
    *held() = Some(Arc::new(Held { snapshot: 42, served: quiet, deadline }));
    assert!(!release(Some(41)));
    assert!(current(42).is_some());
    assert_eq!(ask(42, &json!({"op": "release"}), None).unwrap().released.as_deref(), Some(released::ASKED));
    assert!(current(42).is_none());
    assert!(!release(Some(42)));
    release_at_exit();
}
