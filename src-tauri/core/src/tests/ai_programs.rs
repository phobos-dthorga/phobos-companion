use super::*;
use crate::ai;

/// The shipped row of a program, by its service id.
fn row(id: &str) -> &'static Service {
    ai::service(id).unwrap()
}

fn program(id: &str) -> &'static Program {
    row(id).program.as_ref().unwrap()
}

fn request<'a>(messages: &'a [Value], tools: &'a [Tool]) -> Request<'a> {
    Request {
        service: row("claude-code"),
        key: None,
        model: "default",
        system: "Be brief.",
        messages,
        tools,
        max_tokens: 4_000,
    }
}

fn tool() -> Tool {
    Tool {
        name: "find_reports".into(),
        description: "Finds the tool kit's reports.".into(),
        schema: json!({"type": "object", "properties": {"words": {"type": "string"}}}),
    }
}

/// Reads lines the way a run hands them over, and keeps what reached the window.
fn read(reads: Reads, tools: bool, lines: &[Value]) -> (Answer, String) {
    let mut reader = Reader::new(reads, tools);
    let mut shown = String::new();
    for line in lines {
        reader.line(&format!("{line}\n"), &mut |piece| shown.push_str(piece));
    }
    (reader.finish("Sample Program", "report-1", &Ran { exit: Some(0), ..Ran::default() }), shown)
}

fn delta(text: &str) -> Value {
    json!({"type": "stream_event", "event": {"type": "content_block_delta", "index": 0,
           "delta": {"type": "text_delta", "text": text}}})
}

fn claude_result(text: &str) -> Value {
    json!({"type": "result", "subtype": "success", "is_error": false, "result": text, "stop_reason": "end_turn",
           "usage": {"input_tokens": 10, "cache_creation_input_tokens": 200, "cache_read_input_tokens": 3000,
                     "output_tokens": 42},
           "total_cost_usd": 0.0123})
}

#[test]
fn the_model_and_the_instruction_file_are_filled_in_and_the_programs_own_choice_names_none() {
    let file = Path::new("/sample/instruction.md");
    let own = arguments(program("claude-code"), OWN_CHOICE, file);
    assert!(!own.iter().any(|a| a == "--model" || a.contains('{')));
    let at = own.iter().position(|a| a == "--system-prompt-file").unwrap();
    assert_eq!(Path::new(&own[at + 1]), file);
    let chosen = arguments(program("claude-code"), "sonnet", file);
    assert!(chosen.windows(2).any(|w| w == ["--model", "sonnet"]));
    assert_eq!(chosen.len(), own.len() + 2);
    let codex = arguments(program("codex"), OWN_CHOICE, file);
    assert_eq!(codex.last().map(String::as_str), Some("-"), "Codex reads the question from standard input");
}

#[test]
fn a_first_turn_is_the_question_alone_and_a_later_one_the_whole_conversation() {
    let first = [json!({"role": "user", "content": "Why does it fail?"})];
    assert_eq!(prompt(&request(&first, &[]), false), "Why does it fail?");
    assert_eq!(prompt(&request(&first, &[]), true), "Be brief.\n\nWhy does it fail?");
    let tools = [tool()];
    let offered = prompt(&request(&first, &tools), false);
    assert!(offered.contains(&format!("{MARK} {{\"tool\"")) && offered.contains("- find_reports: Finds"));
    assert!(offered.ends_with("Why does it fail?"));
    let later = [
        json!({"role": "user", "content": "Why does it fail?"}),
        json!({"role": "assistant", "content": "ASK-REPORT {\"tool\": \"find_reports\", \"arguments\": {}}"}),
        json!({"role": "user", "report": true, "failed": false, "content": "2 reports found."}),
        json!({"role": "assistant", "content": "ASK-REPORT {\"tool\": \"ask_report\", \"arguments\": {}}"}),
        json!({"role": "user", "report": true, "failed": true, "content": "The person chose not to send it."}),
    ];
    let said = prompt(&request(&later, &[]), false);
    for part in [
        "The conversation so far, oldest first:\n\n[The question]\nWhy does it fail?",
        "[You asked]\nASK-REPORT",
        "[The tool kit's report]\n2 reports found.",
        "[The report was not given]\nThe person chose not to send it.",
    ] {
        assert!(said.contains(part), "{part}");
    }
    assert!(said.ends_with("Now answer the question, or ask for one more report."));
}

#[test]
fn only_an_answer_that_is_the_request_alone_asks_for_a_report() {
    let call =
        call_of("ASK-REPORT {\"tool\": \"find_reports\", \"arguments\": {\"words\": \"log\"}}", "report-1").unwrap();
    assert_eq!((call.id.as_str(), call.name.as_str()), ("report-1", "find_reports"));
    assert_eq!(call.input, json!({"words": "log"}));
    let fenced = call_of("```json\nASK-REPORT {\"tool\": \"find_reports\"}\n```", "r").unwrap();
    assert_eq!(fenced.input, json!({}), "no arguments is an empty object");
    for not in [
        "It is a null reference.",
        "ASK-REPORT",
        "ASK-REPORT{\"tool\": \"find_reports\"}",
        "ASK-REPORT {\"tool\": \"find_reports\"} and then more",
        "ASK-REPORT {\"tool\": \"find_reports\"}\nThen I will answer.",
        "ASK-REPORT {\"arguments\": {}}",
        "Let me look. ASK-REPORT {\"tool\": \"find_reports\"}",
    ] {
        assert!(call_of(not, "r").is_none(), "{not}");
    }
}

#[test]
fn claude_codes_pieces_stream_and_its_result_gives_the_counts() {
    let (answer, shown) = read(
        Reads::ClaudeStream,
        false,
        &[
            json!({"type": "system", "subtype": "init", "model": "sample"}),
            delta("It is a "),
            delta("null reference."),
            json!({"type": "assistant", "message": {"content": [{"type": "text", "text": "It is a null reference."}]}}),
            claude_result("It is a null reference."),
        ],
    );
    assert_eq!((answer.text.as_str(), shown.as_str()), ("It is a null reference.", "It is a null reference."));
    assert_eq!((answer.stop, answer.input_tokens, answer.output_tokens), (Stop::Finished, Some(3210), Some(42)));
}

#[test]
fn claude_codes_whole_message_is_read_when_it_sends_no_pieces() {
    let (answer, _) = read(
        Reads::ClaudeStream,
        false,
        &[
            json!({"type": "assistant", "message": {"content": [{"type": "text", "text": "Whole."}]}}),
            claude_result("Whole."),
        ],
    );
    assert_eq!(answer.text, "Whole.");
}

#[test]
fn a_failure_is_told_in_the_programs_own_words() {
    let (answer, _) = read(
        Reads::ClaudeStream,
        false,
        &[
            json!({"type": "result", "subtype": "success", "is_error": true, "result": "Not logged in · Please run /login"}),
        ],
    );
    assert_eq!(answer.stop, Stop::Failed);
    assert_eq!(answer.problem.as_deref(), Some("Sample Program said: Not logged in · Please run /login"));
    let unfinished = Reader::new(Reads::ClaudeStream, false).finish(
        "Sample Program",
        "r",
        &Ran { exit: Some(1), errors: "error: unknown option '--safe-mode'\n".into(), timed_out: false },
    );
    assert_eq!(
        unfinished.problem.as_deref(),
        Some("Sample Program stopped before it finished: error: unknown option '--safe-mode'")
    );
    let silent =
        Reader::new(Reads::CodexJson, false).finish("Sample Program", "r", &Ran { exit: Some(2), ..Ran::default() });
    assert!(silent.problem.unwrap().contains("exit code 2"));
    let slow =
        Reader::new(Reads::CodexJson, false).finish("Sample Program", "r", &Ran { timed_out: true, ..Ran::default() });
    assert!(slow.problem.unwrap().contains("took longer than 10 minutes"));
}

#[test]
fn a_request_for_a_report_is_held_back_and_becomes_a_call() {
    let (answer, shown) = read(
        Reads::ClaudeStream,
        true,
        &[
            delta("ASK-"),
            delta("REPORT {\"tool\": \"find_reports\", "),
            delta("\"arguments\": {\"words\": \"log\"}}"),
            claude_result(""),
        ],
    );
    assert_eq!(shown, "", "the request never reaches the window as an answer");
    assert_eq!((answer.stop, answer.text.as_str()), (Stop::Calling, ""));
    assert_eq!(answer.calls[0].name, "find_reports");
    assert_eq!(
        answer.assistant["content"],
        "ASK-REPORT {\"tool\": \"find_reports\", \"arguments\": {\"words\": \"log\"}}"
    );
}

#[test]
fn an_answer_is_shown_from_the_piece_it_stops_looking_like_a_request() {
    let (answer, shown) =
        read(Reads::ClaudeStream, true, &[delta("A"), delta("SK about it: "), delta("it is fine."), claude_result("")]);
    assert_eq!(shown, "ASK about it: it is fine.");
    assert_eq!((answer.stop, answer.text.as_str()), (Stop::Finished, "ASK about it: it is fine."));
}

#[test]
fn codexs_messages_come_whole_and_its_turn_gives_the_counts() {
    let (answer, shown) = read(
        Reads::CodexJson,
        false,
        &[
            json!({"type": "thread.started", "thread_id": "sample"}),
            json!({"type": "item.completed", "item": {"id": "item_1", "type": "reasoning", "text": "thinking"}}),
            json!({"type": "item.completed", "item": {"id": "item_2", "type": "agent_message", "text": "It is fine."}}),
            json!({"type": "turn.completed",
                   "usage": {"input_tokens": 500, "cached_input_tokens": 400, "output_tokens": 20, "reasoning_output_tokens": 5}}),
        ],
    );
    assert_eq!((answer.text.as_str(), shown.as_str()), ("It is fine.", "It is fine."));
    assert_eq!((answer.stop, answer.input_tokens, answer.output_tokens), (Stop::Finished, Some(500), Some(25)));
    let (failed, _) = read(
        Reads::CodexJson,
        false,
        &[json!({"type": "turn.failed", "error": {"message": "You've hit your usage limit."}})],
    );
    assert_eq!(failed.problem.as_deref(), Some("Sample Program said: You've hit your usage limit."));
}

#[test]
fn geminis_pieces_stream_and_its_result_gives_each_models_counts() {
    let (answer, shown) = read(
        Reads::GeminiStream,
        false,
        &[
            json!({"type": "init", "session_id": "sample", "model": "sample"}),
            json!({"type": "message", "role": "user", "content": "the question, echoed"}),
            json!({"type": "message", "role": "assistant", "content": "It is ", "delta": true}),
            json!({"type": "message", "role": "assistant", "content": "fine.", "delta": true}),
            json!({"type": "result", "status": "success",
                   "stats": {"models": {"a": {"tokens": {"prompt": 300, "candidates": 12}},
                                        "b": {"tokens": {"prompt": 100, "candidates": 3}}}}}),
        ],
    );
    assert_eq!((answer.text.as_str(), shown.as_str()), ("It is fine.", "It is fine."));
    assert_eq!((answer.input_tokens, answer.output_tokens), (Some(400), Some(15)));
}

#[test]
fn only_three_facts_are_read_from_a_login_check() {
    let said = r#"{"loggedIn": true, "authMethod": "claude.ai", "apiProvider": "firstParty",
                   "email": "someone@example.com", "orgName": "Sample", "subscriptionType": "max"}"#;
    assert_eq!(
        read_login(LoginReads::ClaudeAuth, Some(0), said),
        Login { logged_in: true, how: LoginHow::Plan, plan: Some("max".into()) }
    );
    let keyed = r#"{"loggedIn": true, "authMethod": "api_key"}"#;
    assert_eq!(read_login(LoginReads::ClaudeAuth, Some(0), keyed).how, LoginHow::Key);
    let out = r#"{"loggedIn": false, "authMethod": "none"}"#;
    assert_eq!(
        read_login(LoginReads::ClaudeAuth, Some(1), out),
        Login { logged_in: false, how: LoginHow::Unknown, plan: None }
    );
    let odd = r#"{"loggedIn": true, "authMethod": "claude.ai", "subscriptionType": "a plan with spaces"}"#;
    assert_eq!(read_login(LoginReads::ClaudeAuth, Some(0), odd).plan, None, "a plan's name is one plain word");
    assert!(!read_login(LoginReads::ClaudeAuth, Some(0), "not JSON").logged_in);
    assert_eq!(read_login(LoginReads::CodexStatus, Some(0), "Logged in using ChatGPT\n").how, LoginHow::Plan);
    assert_eq!(
        read_login(LoginReads::CodexStatus, Some(0), "Logged in using an API key - sk-***\n").how,
        LoginHow::Key
    );
    assert!(!read_login(LoginReads::CodexStatus, Some(1), "Not logged in\n").logged_in);
}

#[test]
fn a_real_program_is_followed_to_its_end_and_output_that_is_not_its_kind_is_no_answer() {
    // git is one program every computer the Companion runs on has; it prints a line that is not JSON, so nothing is read.
    let git = crate::acp::find_on_path("git").expect("git is needed by the Companion");
    let folder = work_folder().unwrap();
    let child = start(&git, &["--version".into()], &folder, &["SAMPLE_VARIABLE".into()]).unwrap();
    let mut lines = Vec::new();
    let ran = follow(child, Some("ignored".into()), Duration::from_secs(60), &mut |line| lines.push(line.to_owned()));
    std::fs::remove_dir_all(&folder).unwrap();
    assert_eq!((ran.exit, ran.timed_out), (Some(0), false));
    assert!(lines[0].starts_with("git version"));
    let mut reader = Reader::new(Reads::ClaudeStream, false);
    for line in &lines {
        reader.line(line, &mut |_| ());
    }
    let answer = reader.finish("git", "r", &ran);
    assert_eq!(answer.stop, Stop::Failed);
    assert!(answer.problem.unwrap().starts_with("git stopped before it finished"));
}
