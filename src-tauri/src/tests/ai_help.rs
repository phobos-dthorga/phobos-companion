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

// The conversation with the tool kit's reports (0.73.0): a stand-in service and kit, so no question is sent and no report runs.

fn prepared(local: bool) -> Prepared {
    Prepared {
        id: 1,
        what: "explain-fault".into(),
        service: if local { "Ollama" } else { "Claude (Anthropic)" }.into(),
        model: "sample-model".into(),
        local,
        kind: if local { ai::Kind::Local } else { ai::Kind::Key },
        charged: !local,
        tools: true,
        instruction: "Be brief.".into(),
        text: "Why?".into(),
        characters: 4,
    }
}

fn ready(local: bool) -> ai::Ready {
    ai::Ready {
        service: ai::service(if local { "ollama" } else { "anthropic" }).unwrap(),
        model: "sample-model".into(),
        key: (!local).then(|| "sample-key".into()),
        length: Length::Short,
        tools: true,
    }
}

fn conversation(local: bool) -> Conversation {
    let mut found = Conversation::new(prepared(local));
    found.tools =
        vec![Tool { name: "find_reports".into(), description: "Finds.".into(), schema: json!({"type": "object"}) }];
    found
}

fn calling(text: &str, ids: &[&str]) -> Answer {
    Answer {
        text: text.into(),
        stop: Stop::Calling,
        problem: None,
        input_tokens: Some(100),
        output_tokens: Some(10),
        calls: ids
            .iter()
            .map(|id| ToolCall { id: (*id).into(), name: "find_reports".into(), input: json!({"words": "log"}) })
            .collect(),
        assistant: json!({"role": "assistant", "content": [{"type": "text", "text": text}]}),
        tools_refused: false,
    }
}

fn answered(text: &str) -> Answer {
    Answer { stop: Stop::Finished, calls: Vec::new(), ..calling(text, &[]) }
}

/// A stand-in service that answers from a list, in order, and keeps every request's messages and how many tools it offered.
struct StandIn {
    answers: std::cell::RefCell<Vec<Answer>>,
    seen: std::cell::RefCell<Vec<(Vec<Value>, usize)>>,
}

impl StandIn {
    fn new(answers: Vec<Answer>) -> Self {
        Self { answers: answers.into(), seen: Default::default() }
    }

    fn ask(&self, request: &Request, on_text: &mut dyn FnMut(&str)) -> Answer {
        self.seen.borrow_mut().push((request.messages.to_vec(), request.tools.len()));
        let answer = self.answers.borrow_mut().remove(0);
        on_text(&answer.text);
        answer
    }
}

fn kit(_: &ToolCall) -> (String, bool) {
    ("2 reports found.".into(), false)
}

#[test]
fn a_local_model_asks_a_report_and_it_goes_at_once_then_it_answers() {
    let service = StandIn::new(vec![calling("Let me look.", &["c1"]), answered("It is a null reference.")]);
    let mut heard = Vec::new();
    let mut talk = conversation(true);
    let step = drive(&mut talk, &ready(true), &|r, t| service.ask(r, t), &kit, &mut |e| heard.push(e));
    let Step::Answered { answer, calls, tools_unavailable } = step else { panic!("it should answer") };
    assert_eq!(answer.text, "Let me look.\n\nIt is a null reference.");
    assert_eq!((answer.input_tokens, answer.output_tokens, tools_unavailable), (Some(200), Some(20), false));
    assert_eq!(calls.len(), 1);
    assert!(calls[0].sent);
    assert_eq!(calls[0].summary, "Find reports about \"log\"");
    assert!(heard.iter().any(|e| matches!(e, Event::Call { .. })));
    // The second request carries the model's own message, then the report's answer, in chat completions' shape (Ollama's).
    let seen = service.seen.borrow();
    assert_eq!(seen[1].0[1]["role"], "assistant");
    assert_eq!(seen[1].0[2], json!({"role": "tool", "tool_call_id": "c1", "content": "2 reports found."}));
}

#[test]
fn an_online_model_waits_for_a_yes_before_a_report_is_sent() {
    let service = StandIn::new(vec![calling("", &["c1"]), answered("Done.")]);
    let mut talk = conversation(false);
    let step = drive(&mut talk, &ready(false), &|r, t| service.ask(r, t), &kit, &mut |_| ());
    let Step::Waiting { call, calls } = step else { panic!("it should wait for the person") };
    assert_eq!((call.text.as_str(), call.sent, calls.len()), ("2 reports found.", false, 0));
    assert_eq!(service.seen.borrow().len(), 1, "nothing more is sent before the yes");
    // The yes, as answer_call gives it.
    let (id, view) = talk.waiting.remove(0);
    talk.results.push((id, view.text.clone(), false));
    let step = drive(&mut talk, &ready(false), &|r, t| service.ask(r, t), &kit, &mut |_| ());
    assert!(matches!(step, Step::Answered { .. }));
    assert_eq!(service.seen.borrow()[1].0[2]["content"][0]["content"], "2 reports found.");
}

#[test]
fn a_no_tells_the_model_it_was_declined_and_sends_nothing_of_the_report() {
    let service = StandIn::new(vec![calling("", &["c1"]), answered("Without it, then.")]);
    let mut talk = conversation(false);
    drive(&mut talk, &ready(false), &|r, t| service.ask(r, t), &kit, &mut |_| ());
    let (id, _) = talk.waiting.remove(0);
    talk.results.push((id, DECLINED.to_owned(), true));
    drive(&mut talk, &ready(false), &|r, t| service.ask(r, t), &kit, &mut |_| ());
    let sent = service.seen.borrow()[1].0[2].to_string();
    assert!(sent.contains("chose not to send") && !sent.contains("2 reports found"));
}

#[test]
fn a_model_that_cannot_take_tools_is_asked_again_without_them() {
    let refused = Answer { tools_refused: true, stop: Stop::Failed, ..answered("") };
    let service = StandIn::new(vec![refused, answered("Plain answer.")]);
    let mut talk = conversation(true);
    let step = drive(&mut talk, &ready(true), &|r, t| service.ask(r, t), &kit, &mut |_| ());
    let Step::Answered { answer, tools_unavailable, .. } = step else { panic!("it should answer") };
    assert_eq!((answer.text.as_str(), tools_unavailable), ("Plain answer.", true));
    assert_eq!(service.seen.borrow().iter().map(|(_, tools)| *tools).collect::<Vec<_>>(), [1, 0]);
}

#[test]
fn after_six_reports_the_model_is_told_to_answer_with_what_it_has() {
    let mut answers: Vec<Answer> = (0..4).map(|_| calling("", &["a", "b"])).collect();
    answers.push(answered("Enough."));
    let service = StandIn::new(answers);
    let ran = std::cell::Cell::new(0);
    let counting = |c: &ToolCall| {
        ran.set(ran.get() + 1);
        kit(c)
    };
    let mut talk = conversation(true);
    let step = drive(&mut talk, &ready(true), &|r, t| service.ask(r, t), &counting, &mut |_| ());
    let Step::Answered { calls, .. } = step else { panic!("it should answer") };
    assert_eq!((ran.get(), calls.len()), (MAX_CALLS, 8));
    assert!(calls[7].failed && calls[7].text.contains("No more reports"));
}

#[test]
fn the_tools_paragraph_is_part_of_what_is_shown() {
    let said = TOOLS.replace("{calls}", &MAX_CALLS.to_string());
    assert!(said.contains("at most 6 times") && said.contains("Every report only reads"));
}

// A program the person logs in to (0.115.0, `docs/ai.md`, A4): asked through the same conversation, a stand-in in its place.

#[test]
fn a_program_waits_for_a_yes_and_is_then_given_the_report_as_text() {
    let service = StandIn::new(vec![calling("", &["report-1"]), answered("It is a null reference.")]);
    let program =
        ai::Ready { service: ai::service("claude-code").unwrap(), key: None, model: "default".into(), ..ready(false) };
    assert_eq!(program.service.kind(), ai::Kind::Program);
    let mut talk = conversation(false);
    let step = drive(&mut talk, &program, &|r, t| service.ask(r, t), &kit, &mut |_| ());
    assert!(
        matches!(step, Step::Waiting { .. }),
        "a program sends the question online, so each report waits for a yes"
    );
    let (id, view) = talk.waiting.remove(0);
    talk.results.push((id, view.text.clone(), false));
    let step = drive(&mut talk, &program, &|r, t| service.ask(r, t), &kit, &mut |_| ());
    assert!(matches!(step, Step::Answered { .. }));
    let report = &service.seen.borrow()[1].0[2];
    assert_eq!(
        *report,
        json!({"role": "user", "report": true, "failed": false, "content": "2 reports found."}),
        "a program reads the conversation as text, the report marked as one"
    );
}
