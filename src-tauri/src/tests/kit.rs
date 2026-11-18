use super::*;

fn envelope(body: &str) -> Vec<u8> {
    body.as_bytes().to_vec()
}

#[test]
fn counts_the_commands_in_a_manifest() {
    let text = envelope(r#"{"envelope":1,"tool":"manifest","kit_version":"1.0.0","data":{"commands":[{},{}]}}"#);
    assert_eq!(
        parse_envelope(&text, "manifest").and_then(|v| status_of(&v)),
        Ok(KitStatus { kit_version: "1.0.0".to_owned(), tools: 2 })
    );
}

#[test]
fn refuses_text_that_is_not_json() {
    assert_eq!(parse_envelope(b"usage: nothing", "manifest").unwrap_err().code, FailureCode::Unreadable);
}

#[test]
fn refuses_an_envelope_it_does_not_know() {
    let text = envelope(r#"{"envelope":2,"tool":"manifest","kit_version":"9.0.0","data":{"commands":[]}}"#);
    assert_eq!(parse_envelope(&text, "manifest").unwrap_err().code, FailureCode::Unreadable);
}

#[test]
fn refuses_another_tools_answer() {
    let text = envelope(r#"{"envelope":1,"tool":"gate","kit_version":"1.0.0","data":{"commands":[]}}"#);
    assert_eq!(parse_envelope(&text, "manifest").unwrap_err().code, FailureCode::Unreadable);
}

#[test]
fn refuses_an_answer_with_no_commands() {
    let text = envelope(r#"{"envelope":1,"tool":"manifest","kit_version":"1.0.0","data":{}}"#);
    assert_eq!(
        parse_envelope(&text, "manifest").and_then(|v| status_of(&v)).unwrap_err().code,
        FailureCode::Unreadable
    );
}

#[test]
fn failure_codes_reach_the_window_in_its_spelling() {
    let failure = Failure::new(FailureCode::PythonMissing, "none");
    assert_eq!(serde_json::to_value(failure).unwrap()["code"], "python_missing");
}

/// The real path: the pinned kit, run by the real Python.
#[test]
fn reads_the_pinned_kit() {
    let status = read_status().expect("the pinned kit should answer");
    assert!(status.tools >= 15, "only {} tools", status.tools);
    assert!(!status.kit_version.is_empty());
}

#[test]
fn a_progress_line_is_told_from_a_tools_own_text() {
    let counted = parse_progress(r#"{"progress": 1, "label": "Building Thing", "step": 3, "of": 23}"#).unwrap();
    assert_eq!((counted.label.as_deref(), counted.step, counted.of), (Some("Building Thing"), Some(3), Some(23)));
    let detail = parse_progress(r#"  {"progress": 1, "detail": "copied 4 files"}  "#).unwrap();
    assert_eq!((detail.label, detail.detail.as_deref()), (None, Some("copied 4 files")));
    assert_eq!(parse_progress("error: the build failed"), None);
    assert_eq!(parse_progress(r#"{"progress": "#), None);
    assert_eq!(parse_progress(r#"{"other": 1}"#), None);
}

/// Runs the pinned kit for real, on this repository's own changelog, so it needs Python: cargo test -- --ignored
#[test]
#[ignore = "needs Python and the pinned kit on this PC"]
fn hears_a_real_tool_while_it_works_and_still_reads_its_answer() {
    use std::sync::Mutex;
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let arguments: Vec<String> =
        ["changes", "list", "--root", &root.display().to_string(), "--json"].iter().map(|s| (*s).to_owned()).collect();
    let heard = Mutex::new(Vec::new());
    let listener = |progress: Progress| heard.lock().unwrap().push(progress);
    let answer = run_hearing("changes", &arguments, Some(&listener)).unwrap();
    assert_eq!(answer["data"]["changelogs"][0]["changelog"], "CHANGELOG.md");
    let heard = heard.into_inner().unwrap();
    assert!(heard.iter().any(|p| p.label.as_deref() == Some("Reading CHANGELOG.md") && p.of == Some(1)), "{heard:?}");
    // Without a listener the same tool is run silently and answers the same.
    assert_eq!(run("changes", &arguments).unwrap()["data"]["changelogs"], answer["data"]["changelogs"]);
}
