use super::*;
use crate::ai::{Api, Service};
use std::io::Cursor;

fn service(api: Api, address: &str, key: Option<&str>, stream_usage: bool) -> Service {
    Service {
        id: "sample".into(),
        name: "Sample".into(),
        api,
        address: address.into(),
        key_variable: key.map(str::to_owned),
        stream_usage,
        program: None,
    }
}

fn request<'a>(service: &'a Service, messages: &'a [Value], tools: &'a [Tool]) -> Request<'a> {
    Request {
        service,
        key: Some("sk-sample-key"),
        model: "sample-model",
        system: "Be brief.",
        messages,
        tools,
        max_tokens: 4000,
    }
}

fn read(api: Api, stream: &str) -> (Answer, String) {
    let mut heard = String::new();
    let answer = read_stream(api, Cursor::new(stream.to_owned()), &mut |text| heard.push_str(text));
    (answer, heard)
}

#[test]
fn claude_gets_its_own_api_with_the_instruction_as_system_and_no_tools() {
    let claude = service(Api::Anthropic, "https://api.anthropic.com/v1", Some("ANTHROPIC_API_KEY"), true);
    let asked = first_messages("Why?");
    let body = body(&request(&claude, &asked, &[]));
    assert_eq!(body["model"], "sample-model");
    assert_eq!(body["max_tokens"], 4000);
    assert_eq!(body["stream"], true);
    assert_eq!(body["system"], "Be brief.");
    assert_eq!(body["messages"], serde_json::json!([{"role": "user", "content": "Why?"}]));
    assert!(body.get("tools").is_none() && body.get("temperature").is_none());
    let sent = headers(&claude, Some("sk-sample-key"));
    assert!(sent.contains(&("anthropic-version", ANTHROPIC_VERSION.to_owned())));
    assert!(sent.contains(&("x-api-key", "sk-sample-key".to_owned())));
}

#[test]
fn others_get_chat_completions_with_a_bearer_key_and_usage_only_where_known() {
    let openai = service(Api::Openai, "https://api.openai.com/v1", Some("OPENAI_API_KEY"), true);
    let asked = first_messages("Why?");
    let body = body(&request(&openai, &asked, &[]));
    assert_eq!(body["messages"][0], serde_json::json!({"role": "system", "content": "Be brief."}));
    assert_eq!(body["messages"][1], serde_json::json!({"role": "user", "content": "Why?"}));
    assert_eq!(body["stream_options"]["include_usage"], true);
    assert!(body.get("max_tokens").is_none() && body.get("tools").is_none());
    assert!(headers(&openai, Some("k")).contains(&("authorization", "Bearer k".to_owned())));
    let local = service(Api::Openai, "http://127.0.0.1:11434/v1", None, false);
    assert!(super::body(&request(&local, &asked, &[])).get("stream_options").is_none());
    assert_eq!(headers(&local, None), vec![("content-type", "application/json".to_owned())]);
}

#[test]
fn events_join_data_lines_and_skip_the_rest() {
    let stream = "event: a\r\ndata: one\r\ndata: two\r\n\r\n: comment\n\ndata:three\n";
    assert_eq!(events(Cursor::new(stream)).collect::<Vec<_>>(), ["one\ntwo", "three"]);
}

const CLAUDE_STREAM: &str = "event: message_start
data: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":120,\"output_tokens\":1}}}

event: content_block_start
data: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"thinking\",\"thinking\":\"\"}}

event: content_block_delta
data: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"thinking_delta\",\"thinking\":\"\"}}

event: content_block_delta
data: {\"type\":\"content_block_delta\",\"index\":1,\"delta\":{\"type\":\"text_delta\",\"text\":\"A null \"}}

event: content_block_delta
data: {\"type\":\"content_block_delta\",\"index\":1,\"delta\":{\"type\":\"text_delta\",\"text\":\"reference.\"}}

event: message_delta
data: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\"},\"usage\":{\"output_tokens\":42}}

event: message_stop
data: {\"type\":\"message_stop\"}

";

#[test]
fn a_claude_stream_gives_its_text_as_it_comes_and_its_tokens() {
    let (answer, heard) = read(Api::Anthropic, CLAUDE_STREAM);
    assert_eq!(answer.text, "A null reference.");
    assert_eq!(heard, "A null reference.");
    assert_eq!((answer.stop, answer.input_tokens, answer.output_tokens), (Stop::Finished, Some(120), Some(42)));
    assert_eq!(answer.problem, None);
}

#[test]
fn a_refusal_and_a_cut_are_said_as_such() {
    let refused = CLAUDE_STREAM.replace("end_turn", "refusal");
    assert_eq!(read(Api::Anthropic, &refused).0.stop, Stop::Refused);
    let cut = CLAUDE_STREAM.replace("end_turn", "max_tokens");
    assert_eq!(read(Api::Anthropic, &cut).0.stop, Stop::Cut);
}

#[test]
fn an_error_in_the_stream_or_a_stream_that_stops_early_fails_in_words() {
    let error = "event: error\ndata: {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\",\"message\":\"Overloaded\"}}\n\n";
    let (answer, _) = read(Api::Anthropic, error);
    assert_eq!((answer.stop, answer.problem.as_deref()), (Stop::Failed, Some("Overloaded")));
    let early = CLAUDE_STREAM.split("event: message_delta").next().unwrap();
    let (answer, _) = read(Api::Anthropic, early);
    assert_eq!(answer.stop, Stop::Failed);
    assert_eq!(answer.text, "A null reference.");
}

#[test]
fn a_chat_completions_stream_gives_its_text_finish_and_usage() {
    let stream = "data: {\"choices\":[{\"delta\":{\"role\":\"assistant\",\"content\":\"\"}}]}

data: {\"choices\":[{\"delta\":{\"content\":\"Check the \"}}]}

data: {\"choices\":[{\"delta\":{\"content\":\"load order.\"},\"finish_reason\":\"stop\"}]}

data: {\"choices\":[],\"usage\":{\"prompt_tokens\":90,\"completion_tokens\":8}}

data: [DONE]

";
    let (answer, heard) = read(Api::Openai, stream);
    assert_eq!((answer.text.as_str(), heard.as_str()), ("Check the load order.", "Check the load order."));
    assert_eq!((answer.stop, answer.input_tokens, answer.output_tokens), (Stop::Finished, Some(90), Some(8)));
    let cut = stream.replace("\"stop\"", "\"length\"");
    assert_eq!(read(Api::Openai, &cut).0.stop, Stop::Cut);
    let filtered = stream.replace("\"stop\"", "\"content_filter\"");
    assert_eq!(read(Api::Openai, &filtered).0.stop, Stop::Refused);
}

#[test]
fn an_error_body_gives_the_services_own_words() {
    assert_eq!(error_words(&serde_json::json!({"error": {"message": "Invalid API key"}})), "Invalid API key");
    assert_eq!(error_words(&serde_json::json!({"error": "model not found"})), "model not found");
    assert_eq!(error_words(&serde_json::json!({})), "the service did not say why");
    assert!(status_words(401, Cursor::new("{\"error\":{\"message\":\"bad key\"}}")).contains("did not accept the key"));
}

#[test]
fn model_lists_are_sorted_plain_and_capped() {
    let answer = serde_json::json!({"data": [{"id": "b-model"}, {"id": "a-model"}, {"id": "a-model"}, {"id": "bad\nid"}, {"x": 1}]});
    assert_eq!(model_ids(&answer), ["a-model", "b-model"]);
}

fn kit_tool() -> Tool {
    Tool {
        name: "find_reports".into(),
        description: "Finds the kit's read-only reports.".into(),
        schema: serde_json::json!({"type": "object", "properties": {"words": {"type": "string"}}}),
    }
}

#[test]
fn tools_go_in_each_apis_own_shape() {
    let asked = first_messages("Why?");
    let tools = [kit_tool()];
    let claude = service(Api::Anthropic, "https://api.anthropic.com/v1", Some("ANTHROPIC_API_KEY"), true);
    let sent = body(&request(&claude, &asked, &tools));
    assert_eq!(sent["tools"][0]["name"], "find_reports");
    assert_eq!(sent["tools"][0]["input_schema"]["type"], "object");
    assert!(sent.get("tool_choice").is_none(), "the model chooses; it is never forced");
    let local = service(Api::Openai, "http://127.0.0.1:11434/v1", None, false);
    let sent = body(&request(&local, &asked, &tools));
    assert_eq!(sent["tools"][0]["type"], "function");
    assert_eq!(sent["tools"][0]["function"]["parameters"]["type"], "object");
}

const CLAUDE_CALLING: &str = "event: message_start
data: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":300}}}

event: content_block_start
data: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"thinking\",\"thinking\":\"\",\"signature\":\"\"}}

event: content_block_delta
data: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"signature_delta\",\"signature\":\"sig-1\"}}

event: content_block_stop
data: {\"type\":\"content_block_stop\",\"index\":0}

event: content_block_start
data: {\"type\":\"content_block_start\",\"index\":1,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}

event: content_block_delta
data: {\"type\":\"content_block_delta\",\"index\":1,\"delta\":{\"type\":\"text_delta\",\"text\":\"Let me look.\"}}

event: content_block_stop
data: {\"type\":\"content_block_stop\",\"index\":1}

event: content_block_start
data: {\"type\":\"content_block_start\",\"index\":2,\"content_block\":{\"type\":\"tool_use\",\"id\":\"toolu_1\",\"name\":\"find_reports\",\"input\":{}}}

event: content_block_delta
data: {\"type\":\"content_block_delta\",\"index\":2,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":\"{\\\"words\\\": \\\"lo\"}}

event: content_block_delta
data: {\"type\":\"content_block_delta\",\"index\":2,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":\"g\\\"}\"}}

event: content_block_stop
data: {\"type\":\"content_block_stop\",\"index\":2}

event: message_delta
data: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"tool_use\"},\"usage\":{\"output_tokens\":50}}

";

#[test]
fn claude_asking_for_a_tool_gives_the_call_and_its_own_message_whole() {
    let (answer, heard) = read(Api::Anthropic, CLAUDE_CALLING);
    assert_eq!((answer.stop, heard.as_str()), (Stop::Calling, "Let me look."));
    assert_eq!(
        answer.calls,
        [ToolCall { id: "toolu_1".into(), name: "find_reports".into(), input: serde_json::json!({"words": "log"}) }]
    );
    let content = &answer.assistant["content"];
    assert_eq!(answer.assistant["role"], "assistant");
    assert_eq!(content[0], serde_json::json!({"type": "thinking", "thinking": "", "signature": "sig-1"}));
    assert_eq!(content[1], serde_json::json!({"type": "text", "text": "Let me look."}));
    assert_eq!(content[2]["input"], serde_json::json!({"words": "log"}));
}

#[test]
fn a_chat_completions_tool_call_is_gathered_from_its_pieces() {
    let stream = "data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"id\":\"call_a\",\"function\":{\"name\":\"ask_report\",\"arguments\":\"{\\\"command\\\":\"}}]}}]}

data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"function\":{\"arguments\":\"\\\"decisions\\\"}\"}}]},\"finish_reason\":\"tool_calls\"}]}

data: [DONE]

";
    let (answer, heard) = read(Api::Openai, stream);
    assert_eq!((answer.stop, heard.as_str()), (Stop::Calling, ""));
    assert_eq!(answer.calls[0].input, serde_json::json!({"command": "decisions"}));
    assert_eq!(answer.assistant["content"], Value::Null);
    assert_eq!(answer.assistant["tool_calls"][0]["function"]["arguments"], "{\"command\":\"decisions\"}");
    // Ollama sends a whole call at once, its arguments an object, and may end with "stop".
    let whole = "data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"id\":\"call_b\",\"function\":{\"name\":\"find_reports\",\"arguments\":{\"words\":\"save\"}}}]},\"finish_reason\":\"stop\"}]}

data: [DONE]

";
    let (answer, _) = read(Api::Openai, whole);
    assert_eq!(answer.stop, Stop::Calling);
    assert_eq!(
        (answer.calls[0].id.as_str(), &answer.calls[0].input),
        ("call_b", &serde_json::json!({"words": "save"}))
    );
}

#[test]
fn results_go_back_in_each_apis_own_shape() {
    let results =
        [("toolu_1".to_owned(), "Two reports.".to_owned(), false), ("toolu_2".to_owned(), "Refused.".to_owned(), true)];
    let claude = tool_results(Api::Anthropic, &results);
    assert_eq!(claude.len(), 1);
    assert_eq!(claude[0]["role"], "user");
    assert_eq!(
        claude[0]["content"][1],
        serde_json::json!({"type": "tool_result", "tool_use_id": "toolu_2", "content": "Refused.", "is_error": true})
    );
    let others = tool_results(Api::Openai, &results);
    assert_eq!(others[0], serde_json::json!({"role": "tool", "tool_call_id": "toolu_1", "content": "Two reports."}));
    assert_eq!(others[1]["content"], "Error: Refused.");
}

#[test]
fn a_model_that_cannot_take_tools_is_told_apart() {
    assert!(refuses_tools(400, "The service answered 400: llama2 does not support tools"));
    assert!(!refuses_tools(400, "The service answered 400: bad request"));
    assert!(!refuses_tools(500, "tool server failed"));
}

/// Asks a real Ollama on this computer for its models, which loads none (run by hand: `cargo test -p companion-core -- --ignored
/// a_real_ollama`). Never in the gate, and never a question: a question would load a model onto the graphics card.
#[test]
#[ignore]
fn a_real_ollama_lists_its_models() {
    let ollama = crate::ai::service("ollama").unwrap();
    let models = list_models(ollama, None).unwrap();
    assert!(!models.is_empty());
    println!("{} models, the first {:?}", models.len(), &models[..models.len().min(3)]);
}
