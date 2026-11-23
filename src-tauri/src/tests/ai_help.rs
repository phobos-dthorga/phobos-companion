use super::*;
use serde_json::json;

fn fault() -> Value {
    json!({
        "id": "s1",
        "level": "Error",
        "count": 12,
        "first": {"line": 1032, "time": ""},
        "last": {"line": 5521, "time": ""},
        "example": {"headline": "Exception ticking Sample: NullReferenceException", "body": ["at Sample.Tick ()"], "bodyLines": 1},
        "evidence": [{"kind": "namespace", "value": "SampleMod", "mod": "Sample Mod", "messages": 12}],
        "frames": [{"method": "SampleMod.Comp.Tick", "file": "Comp.cs", "line": 44, "assembly": "SampleMod"}],
    })
}

#[test]
fn a_fault_is_told_from_the_log_readers_own_fields() {
    let text = fault_text("Sample Game", &fault());
    assert!(text.starts_with(
        "Game: Sample Game\nLevel: Error. Seen 12 times in the log, first at line 1032, last at line 5521."
    ));
    assert!(text.contains("Message:\nException ticking Sample: NullReferenceException\nat Sample.Tick ()"));
    assert!(text.contains("- SampleMod.Comp.Tick (Comp.cs:44) in SampleMod"));
    assert!(text.contains("- Sample Mod (namespace: SampleMod), in 12 messages"));
}

#[test]
fn a_long_fault_is_cut_and_says_so() {
    let mut long = fault();
    long["example"]["body"] = json!(vec!["x".repeat(500); 30]);
    long["frames"] = json!(vec![json!({"method": "M".repeat(800), "file": "", "line": 0, "assembly": ""}); 25]);
    let text = fault_text("Sample Game", &long);
    assert!(text.ends_with("characters.]"));
    assert!(text.chars().count() < MAX_TEXT + 200);
}

#[test]
fn the_instruction_takes_the_chosen_length() {
    let filled = instruction(EXPLAIN_FAULT, Length::Medium);
    assert!(filled.contains("under 350 words"));
    assert!(!filled.contains("{length}"));
}

#[test]
fn only_a_fault_the_last_reading_named_can_be_asked_about() {
    logs_page::remember("sample-game", &json!({"groups": [fault()]}));
    assert_eq!(logs_page::remembered("sample-game", "s1").unwrap()["count"], 12);
    assert!(logs_page::remembered("sample-game", "s2").is_err());
    assert!(logs_page::remembered("other-game", "s1").is_err());
    logs_page::remember("sample-game", &json!({"groups": []}));
    assert!(logs_page::remembered("sample-game", "s1").is_err());
}
