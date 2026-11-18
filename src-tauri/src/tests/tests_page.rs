use super::*;

#[test]
fn a_verdict_is_one_json_line_the_kit_reads() {
    let line = verdict_line("127", "passed", "re-fitted on the M1A2", "2026-11-17T12:05:00Z").unwrap();
    let value: Value = serde_json::from_str(&line).unwrap();
    assert_eq!(value["row"], "127");
    assert_eq!(value["verdict"], "passed");
    assert_eq!(value["time"], "2026-11-17T12:05:00Z");
    assert_eq!(value["note"], "re-fitted on the M1A2");
    assert_eq!(value["format"], 1);
    assert!(!line.contains('\n'));
}

#[test]
fn a_note_is_folded_onto_one_line() {
    let line = verdict_line("P1", "failed", "  stuck\n on the\tramp ", "t").unwrap();
    let value: Value = serde_json::from_str(&line).unwrap();
    assert_eq!(value["note"], "stuck on the ramp");
}

#[test]
fn rows_and_verdicts_the_kit_would_not_read_are_refused() {
    assert!(verdict_line("", "passed", "", "t").is_err());
    assert!(verdict_line("1 | 2", "passed", "", "t").is_err());
    assert!(verdict_line("31a", "maybe", "", "t").is_err());
    assert!(verdict_line("31a", "cleared", "", "t").is_ok());
    assert!(verdict_line("1", "passed", &"x".repeat(MAX_NOTE + 1), "t").is_err());
}

#[test]
fn times_are_utc_as_the_kit_reads_them() {
    assert_eq!(format_utc(0), "1970-01-01T00:00:00Z");
    assert_eq!(format_utc(951_782_400), "2000-02-29T00:00:00Z");
    assert_eq!(format_utc(1_794_917_100), "2026-11-17T12:05:00Z");
}

#[test]
fn each_repository_has_its_own_verdicts_file() {
    let file = verdicts_file(Path::new("data"), "phobos-rimworld");
    assert_eq!(file, Path::new("data").join("test-verdicts").join("phobos-rimworld.jsonl"));
}

#[test]
fn verdicts_are_appended_never_replaced() {
    let folder = std::env::temp_dir().join(format!("companion-verdicts-{}", std::process::id()));
    let file = folder.join("test-verdicts").join("r.jsonl");
    append(&file, "{\"a\":1}").unwrap();
    append(&file, "{\"a\":2}").unwrap();
    assert_eq!(fs::read_to_string(&file).unwrap(), "{\"a\":1}\n{\"a\":2}\n");
    fs::remove_dir_all(&folder).unwrap();
}

#[test]
fn a_decision_is_one_json_line_the_kit_reads() {
    let line = decision_line("vehicles.stage.cabTemperature", "no-row", " the dashboard\nshows it ", "t").unwrap();
    let value: Value = serde_json::from_str(&line).unwrap();
    assert_eq!(value["key"], "vehicles.stage.cabTemperature");
    assert_eq!(value["decision"], "no-row");
    assert_eq!(value["note"], "the dashboard shows it");
    assert_eq!(value["format"], 1);
}

#[test]
fn keys_and_decisions_the_kit_would_not_read_are_refused() {
    assert!(decision_line("", "no-row", "", "t").is_err());
    assert!(decision_line("a key with spaces", "no-row", "", "t").is_err());
    assert!(decision_line("vehicles.tune-done.PhobosTune_EnginePower", "make-row", "", "t").is_ok());
    assert!(decision_line("k", "maybe", "", "t").is_err());
    assert!(decision_line("k", "cleared", "", "t").is_ok());
    assert!(decision_line(&"k".repeat(MAX_KEY + 1), "no-row", "", "t").is_err());
    assert!(decision_line("k", "no-row", &"x".repeat(MAX_NOTE + 1), "t").is_err());
}

#[test]
fn decisions_sit_beside_the_verdicts() {
    let file = decisions_file(Path::new("data"), "phobos-rimworld");
    assert_eq!(file, Path::new("data").join("test-key-decisions").join("phobos-rimworld.jsonl"));
}

#[test]
fn a_kit_too_old_to_send_a_list_gives_an_empty_one() {
    assert_eq!(list_or_empty(&Value::Null), Value::Array(Vec::new()));
    assert_eq!(list_or_empty(&serde_json::json!([1])), serde_json::json!([1]));
}
