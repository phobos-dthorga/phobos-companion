use super::*;

#[test]
fn the_ledger_is_one_read_only_run_per_repository() {
    assert_eq!(arguments(Path::new("repo")), ["installs", "settings", "--root", "repo", "--json"]);
}

#[test]
fn the_last_mark_for_a_setting_decides() {
    let text = [
        r#"{"format":1,"id":"A|added|c1","seen":true,"time":"t1"}"#,
        r#"{"format":1,"id":"B|added|c2","seen":true,"time":"t2"}"#,
        "not a line the program wrote",
        r#"{"format":1,"id":"A|added|c1","seen":false,"time":"t3"}"#,
    ]
    .join("\n");
    assert_eq!(seen_ids(&text), ["B|added|c2"]);
    assert!(seen_ids("").is_empty());
}

#[test]
fn marks_are_one_json_line_each_and_odd_ids_are_refused() {
    let lines = mark_lines(&["A|added|c1".to_owned()], true, "2026-11-19T07:00:00Z").unwrap();
    assert_eq!(lines, [r#"{"format":1,"id":"A|added|c1","seen":true,"time":"2026-11-19T07:00:00Z"}"#]);
    assert!(mark_lines(&[], true, "t").is_err());
    assert!(mark_lines(&["two\nlines".to_owned()], true, "t").is_err());
    assert!(mark_lines(&["x".repeat(500)], true, "t").is_err());
}

#[test]
fn each_repository_has_its_own_marks_file() {
    let data = Path::new("data");
    assert_eq!(seen_file(data, "first-mods"), data.join("settings-seen").join("first-mods.jsonl"));
}
