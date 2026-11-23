use super::*;

#[test]
fn the_setup_lines_are_asked_in_full_and_as_json() {
    assert_eq!(setup_arguments(), ["mcp", "setup", "--no-redact", "--json"]);
}

#[test]
fn only_the_setup_report_is_asked_for_never_the_server() {
    assert!(!setup_arguments().iter().any(|argument| argument == "serve"));
}
