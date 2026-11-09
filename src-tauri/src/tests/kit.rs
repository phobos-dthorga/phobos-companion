use super::*;

fn envelope(body: &str) -> Vec<u8> {
    body.as_bytes().to_vec()
}

#[test]
fn counts_the_commands_in_a_manifest() {
    let text = envelope(r#"{"envelope":1,"tool":"manifest","kit_version":"1.0.0","data":{"commands":[{},{}]}}"#);
    assert_eq!(parse_manifest(&text), Ok(KitStatus { kit_version: "1.0.0".to_owned(), tools: 2 }));
}

#[test]
fn refuses_text_that_is_not_json() {
    assert_eq!(parse_manifest(b"usage: nothing").unwrap_err().code, FailureCode::Unreadable);
}

#[test]
fn refuses_an_envelope_it_does_not_know() {
    let text = envelope(r#"{"envelope":2,"tool":"manifest","kit_version":"9.0.0","data":{"commands":[]}}"#);
    assert_eq!(parse_manifest(&text).unwrap_err().code, FailureCode::Unreadable);
}

#[test]
fn refuses_another_tools_answer() {
    let text = envelope(r#"{"envelope":1,"tool":"gate","kit_version":"1.0.0","data":{"commands":[]}}"#);
    assert_eq!(parse_manifest(&text).unwrap_err().code, FailureCode::Unreadable);
}

#[test]
fn refuses_an_answer_with_no_commands() {
    let text = envelope(r#"{"envelope":1,"tool":"manifest","kit_version":"1.0.0","data":{}}"#);
    assert_eq!(parse_manifest(&text).unwrap_err().code, FailureCode::Unreadable);
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
