use super::*;
use serde_json::json;

fn call(name: &str, input: Value) -> ToolCall {
    ToolCall { id: "c1".into(), name: name.into(), input }
}

#[test]
fn only_the_three_tools_go_to_the_kit_as_one_argument_each() {
    let asked = call("ask_report", json!({"command": "decisions", "report": "list"}));
    assert_eq!(
        call_arguments(&asked).unwrap(),
        ["mcp", "call", "--tool=ask_report", "--arguments={\"command\":\"decisions\",\"report\":\"list\"}", "--json"]
    );
    assert!(call_arguments(&call("delete_everything", json!({}))).is_err());
    assert!(call_arguments(&call("find_reports", json!(["not", "an", "object"]))).is_err());
    assert!(call_arguments(&call("find_reports", json!({"words": "x".repeat(MAX_ARGUMENTS)}))).is_err());
}

#[test]
fn a_bad_call_is_told_to_the_model_in_words_and_never_reaches_the_kit() {
    let (text, failed) = super::call(&call("delete_everything", json!({})));
    assert!(failed);
    assert!(text.contains("no tool"));
}

#[test]
fn the_kits_tools_are_read_and_any_other_left_out() {
    let data = json!({"tools": [
        {"name": "find_reports", "description": "Finds.", "inputSchema": {"type": "object"}},
        {"name": "write_files", "description": "No.", "inputSchema": {"type": "object"}},
    ]});
    let tools = tools_of(&data);
    assert_eq!(tools.len(), 1);
    assert_eq!((tools[0].name.as_str(), &tools[0].schema), ("find_reports", &json!({"type": "object"})));
}

#[test]
fn each_call_is_said_in_a_few_words() {
    assert_eq!(
        summary(&call("find_reports", json!({"words": "save colonists"}))),
        "Find reports about \"save colonists\""
    );
    assert_eq!(summary(&call("describe_report", json!({"command": "rimworld-log"}))), "Describe rimworld-log");
    assert_eq!(
        summary(&call(
            "ask_report",
            json!({"command": "rimworld-save", "report": "pawns", "repository": "sample-mods", "arguments": {"top": 5}})
        )),
        "Ask rimworld-save pawns about sample-mods, with {\"top\":5}"
    );
}

/// The real pinned kit lists the three tools and answers one call that only searches its own manifest (run by hand: `cargo test
/// -p phobos-companion -- --ignored a_real_kit`). No service is asked and nothing goes online.
#[test]
#[ignore]
fn a_real_kit_offers_the_tools_and_answers_a_call() {
    let tools = definitions().unwrap();
    assert_eq!(tools.iter().map(|t| t.name.as_str()).collect::<Vec<_>>(), NAMES);
    let (text, failed) = super::call(&call("find_reports", json!({"words": "decisions"})));
    assert!(!failed, "{text}");
    assert!(text.contains("\"command\": \"decisions\""), "{text}");
    let (text, failed) = super::call(&call("ask_report", json!({"command": "decisions", "report": "answer"})));
    assert!(failed && text.contains("no offered report"), "{text}");
}
