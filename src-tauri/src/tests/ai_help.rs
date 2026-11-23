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
fn every_instruction_takes_a_length_and_names_none_of_its_own() {
    for template in [EXPLAIN_FAULT, SUMMARISE_VERSION, UPDATE_MEANING] {
        assert!(template.contains("{length}"));
        assert!(!instruction(template, Length::Short).contains('{'));
    }
}

fn version() -> Value {
    json!({
        "version": "0.71.0",
        "heading": "2026-11-23",
        "summary": "",
        "entries": [
            {"version": "0.71.0", "section": "Added", "text": "**Explain this fault** on the Logs page."},
            {"version": "0.71.0", "section": "Added", "text": "**Settings → AI services**."},
            {"version": "0.71.0", "section": "Changed", "text": "Two rules change."},
        ],
    })
}

#[test]
fn a_version_is_told_by_its_sections_as_the_changelog_writes_them() {
    let text = version_text("Sample Tool", "CHANGELOG.md", &version());
    assert_eq!(
        text,
        "Product: Sample Tool (its changelog: CHANGELOG.md)\nVersion: 0.71.0 (2026-11-23)\n\nAdded:\n- **Explain this fault** on \
         the Logs page.\n- **Settings → AI services**.\n\nChanged:\n- Two rules change."
    );
}

#[test]
fn only_a_version_the_last_reading_named_can_be_asked_about() {
    let found = changes_page::RepositoryChanges {
        repository: "sample-repo".into(),
        changelogs: json!([{"changelog": "CHANGELOG.md", "product": "Sample Tool", "versions": [version()]}]),
    };
    changes_page::remember("sample-game", &[found]);
    let (product, v) =
        changes_page::remembered_version("sample-game", "sample-repo", "CHANGELOG.md", "0.71.0").unwrap();
    assert_eq!((product.as_str(), v["entries"].as_array().unwrap().len()), ("Sample Tool", 3));
    assert!(changes_page::remembered_version("sample-game", "sample-repo", "CHANGELOG.md", "0.70.0").is_err());
    assert!(changes_page::remembered_version("sample-game", "other-repo", "CHANGELOG.md", "0.71.0").is_err());
    assert!(changes_page::remembered_version("other-game", "sample-repo", "CHANGELOG.md", "0.71.0").is_err());
}

#[test]
fn a_report_is_told_as_plain_words_tables_and_all() {
    let report = json!({
        "title": "After the update",
        "facts": [{"label": "Since", "value": "2026-11-20"}],
        "lines": ["2 updates since then."],
        "blocks": [],
        "sections": [
            {"heading": "Names", "level": 2, "blocks": [
                {"type": "text", "text": "Every name still found."},
                {"type": "bullets", "items": ["Sample.Tick", "Sample.Draw"]},
            ]},
            {"heading": "Sizes", "level": 2, "blocks": [
                {"type": "table", "headers": ["Mod", "Added"], "rows": [["Sample Boats", 3], ["Sample Sails", null]], "total": 40},
                {"type": "chart", "title": "Sizes", "description": "How big each update was."},
                {"type": "globe", "tiles": 10},
            ]},
        ],
    });
    assert_eq!(
        report_text(&report),
        "After the update\nSince: 2026-11-20\n2 updates since then.\n\nNames:\nEvery name still found.\n- Sample.Tick\n- \
         Sample.Draw\n\nSizes:\nMod | Added\nSample Boats | 3\nSample Sails | \n[38 more rows left out]\n[A chart, Sizes: How \
         big each update was.]"
    );
}

#[test]
fn only_an_update_check_this_run_made_can_be_asked_about() {
    assert!(other_code_page::remembered_check("sample-game", "sample-repo").is_err());
    other_code_page::remember_check("sample-game", "sample-repo", &json!({"title": "First"}));
    other_code_page::remember_check("sample-game", "sample-repo", &json!({"title": "Second"}));
    assert_eq!(other_code_page::remembered_check("sample-game", "sample-repo").unwrap()["title"], "Second");
    assert!(other_code_page::remembered_check("sample-game", "other-repo").is_err());
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
