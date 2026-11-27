//! Asking an AI service (0.71.0; `docs/ai.md`, A2): the request each kind of API takes, reading its answer as it streams, and its
//! list of models. Two kinds: Claude's own Messages API (`anthropic`; Rust has no official Anthropic library, so this is plain
//! HTTPS, as Anthropic documents it), and the chat completions API that OpenAI, Gemini, Ollama, LM Studio and most others offer
//! (`openai`). An answer is text to show, never anything to act on.
//!
//! **Tools** (0.73.0, slice 3b): a question may offer the model the tool kit's three read-only tools (phobos-modkit's `mcp tools`).
//! When it asks for one, the answer stops with [`Stop::Calling`], carrying the calls and the model's own message as it gave it (its
//! thinking included, which Claude requires back unchanged); the program runs each call through the kit and sends the results back
//! with [`tool_results`]. Nothing here runs a tool: that is the caller's, behind the kit's own checks.
//!
//! **A program the person logs in to** (`program`, 0.115.0) is asked through `ai_programs`, which starts it for one answer; its
//! conversation is plain text, so its messages here are plain too.

use crate::ai::{Api, Service};
use serde::Serialize;
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::io::{BufRead, BufReader, Read};
use std::time::Duration;

/// The version of Claude's API these requests are written for.
pub const ANTHROPIC_VERSION: &str = "2026-10-21";
const CONNECT: Duration = Duration::from_secs(15);
/// How long before the first word, and for a whole answer: a model on a modest computer can be slow.
const FIRST_WORD: Duration = Duration::from_secs(180);
const WHOLE_ANSWER: Duration = Duration::from_secs(600);
const MAX_ERROR_BODY: u64 = 64 * 1024;
const MAX_MODELS_BODY: u64 = 4 * 1024 * 1024;
const MAX_ANSWER: usize = 200_000;
const MAX_MODELS: usize = 500;

/// A tool the model may ask for: its name, what it does, and the JSON schema of what it takes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub schema: Value,
}

/// One call the model asked for.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub input: Value,
}

/// One question for one model: the conversation so far, in the API's own shape (see [`first_messages`]).
pub struct Request<'a> {
    pub service: &'a Service,
    pub key: Option<&'a str>,
    pub model: &'a str,
    pub system: &'a str,
    pub messages: &'a [Value],
    pub tools: &'a [Tool],
    pub max_tokens: u32,
}

/// How an answer ended.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Stop {
    /// It said all it meant to.
    Finished,
    /// It asked for one or more tools, and waits for their results.
    Calling,
    /// It reached its length and was cut off.
    Cut,
    /// The service declined to answer.
    Refused,
    /// The service could not be reached, or said something went wrong.
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Answer {
    pub text: String,
    pub stop: Stop,
    /// What went wrong, in the service's words where it gave them.
    pub problem: Option<String>,
    pub input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
    /// The tools it asked for, when it stopped to call them.
    #[serde(skip)]
    pub calls: Vec<ToolCall>,
    /// The model's own message, to send back with the tools' results.
    #[serde(skip)]
    pub assistant: Value,
    /// The service refused the request because of its tools: this model cannot use them.
    #[serde(skip)]
    pub tools_refused: bool,
}

impl Answer {
    pub(crate) fn new() -> Self {
        Self {
            text: String::new(),
            stop: Stop::Finished,
            problem: None,
            input_tokens: None,
            output_tokens: None,
            calls: Vec::new(),
            assistant: Value::Null,
            tools_refused: false,
        }
    }

    pub(crate) fn failed(problem: impl Into<String>) -> Self {
        Self { stop: Stop::Failed, problem: Some(problem.into()), ..Self::new() }
    }
}

/// The conversation's first message: the person's question.
pub fn first_messages(user: &str) -> Vec<Value> {
    vec![json!({"role": "user", "content": user})]
}

/// The messages that answer the calls the model made: (the call's id, its text, whether it failed or was refused).
pub fn tool_results(api: Api, results: &[(String, String, bool)]) -> Vec<Value> {
    match api {
        Api::Anthropic => vec![json!({"role": "user", "content": results
            .iter()
            .map(|(id, text, failed)| json!({"type": "tool_result", "tool_use_id": id, "content": text, "is_error": failed}))
            .collect::<Vec<_>>()})],
        Api::Openai => results
            .iter()
            .map(|(id, text, failed)| {
                let content = if *failed { format!("Error: {text}") } else { text.clone() };
                json!({"role": "tool", "tool_call_id": id, "content": content})
            })
            .collect(),
        // A program reads the conversation as text (`ai_programs::prompt`): each answer is the person's next message, marked.
        Api::Program => results
            .iter()
            .map(|(_, text, failed)| json!({"role": "user", "report": true, "failed": failed, "content": text}))
            .collect(),
    }
}

/// The request's JSON body.
pub fn body(request: &Request) -> Value {
    match request.service.api {
        Api::Anthropic => {
            let mut body = json!({
                "model": request.model,
                "max_tokens": request.max_tokens,
                "stream": true,
                "system": request.system,
                "messages": request.messages,
            });
            if !request.tools.is_empty() {
                body["tools"] = request
                    .tools
                    .iter()
                    .map(|t| json!({"name": t.name, "description": t.description, "input_schema": t.schema}))
                    .collect();
            }
            body
        }
        Api::Openai => {
            let mut messages = vec![json!({"role": "system", "content": request.system})];
            messages.extend(request.messages.iter().cloned());
            let mut body = json!({"model": request.model, "stream": true, "messages": messages});
            if request.service.stream_usage {
                body["stream_options"] = json!({"include_usage": true});
            }
            if !request.tools.is_empty() {
                body["tools"] = request
                    .tools
                    .iter()
                    .map(|t| {
                        json!({"type": "function",
                               "function": {"name": t.name, "description": t.description, "parameters": t.schema}})
                    })
                    .collect();
            }
            body
        }
        Api::Program => Value::Null,
    }
}

/// The headers a request carries, the key among them; never logged or shown.
pub fn headers(service: &Service, key: Option<&str>) -> Vec<(&'static str, String)> {
    let mut found = vec![("content-type", "application/json".to_owned())];
    match (service.api, key) {
        (Api::Anthropic, key) => {
            found.push(("anthropic-version", ANTHROPIC_VERSION.to_owned()));
            if let Some(key) = key {
                found.push(("x-api-key", key.to_owned()));
            }
        }
        (Api::Openai, Some(key)) => found.push(("authorization", format!("Bearer {key}"))),
        (Api::Openai, None) | (Api::Program, _) => {}
    }
    found
}

fn endpoint(service: &Service, path: &str) -> String {
    format!("{}/{path}", service.address.trim_end_matches('/'))
}

/// The data of each server-sent event, in order: its `data:` lines joined, as the event-stream format says.
pub fn events(reader: impl BufRead) -> impl Iterator<Item = String> {
    let mut lines = reader.lines();
    let mut data: Vec<String> = Vec::new();
    let mut ended = false;
    std::iter::from_fn(move || {
        while !ended {
            match lines.next() {
                Some(Ok(line)) => {
                    let line = line.trim_end_matches('\r');
                    if line.is_empty() {
                        if !data.is_empty() {
                            return Some(std::mem::take(&mut data).join("\n"));
                        }
                    } else if let Some(rest) = line.strip_prefix("data:") {
                        data.push(rest.strip_prefix(' ').unwrap_or(rest).to_owned());
                    }
                }
                _ => {
                    ended = true;
                    if !data.is_empty() {
                        return Some(std::mem::take(&mut data).join("\n"));
                    }
                }
            }
        }
        None
    })
}

fn input_of(text: &str) -> Value {
    if text.trim().is_empty() {
        return json!({});
    }
    serde_json::from_str(text).unwrap_or_else(|_| json!({"unreadable": text}))
}

fn add_text(answer: &mut Answer, text: &str, on_text: &mut dyn FnMut(&str)) {
    if !text.is_empty() && answer.text.len() < MAX_ANSWER {
        answer.text.push_str(text);
        on_text(text);
    }
}

/// Claude's stream: each content block kept whole, by its index, as it came; tool inputs gathered from their pieces.
fn read_anthropic(reader: impl BufRead, on_text: &mut dyn FnMut(&str)) -> Answer {
    let mut answer = Answer::new();
    let mut stopped = false;
    let mut blocks: Vec<Value> = Vec::new();
    let mut inputs: BTreeMap<usize, String> = BTreeMap::new();
    for data in events(reader) {
        let Ok(event) = serde_json::from_str::<Value>(&data) else { continue };
        let index = event["index"].as_u64().unwrap_or(0) as usize;
        match event["type"].as_str().unwrap_or_default() {
            "message_start" => answer.input_tokens = event["message"]["usage"]["input_tokens"].as_u64(),
            "content_block_start" => {
                if blocks.len() <= index {
                    blocks.resize(index + 1, Value::Null);
                }
                blocks[index] = event["content_block"].clone();
                if blocks[index]["type"] == "tool_use" {
                    inputs.insert(index, String::new());
                }
            }
            "content_block_delta" => {
                let delta = &event["delta"];
                // A text piece whose block was never opened opens one, so no text is lost.
                if delta["type"] == "text_delta" && blocks.get(index).is_none_or(Value::is_null) {
                    if blocks.len() <= index {
                        blocks.resize(index + 1, Value::Null);
                    }
                    blocks[index] = json!({"type": "text", "text": ""});
                }
                let Some(block) = blocks.get_mut(index).filter(|b| !b.is_null()) else { continue };
                match delta["type"].as_str().unwrap_or_default() {
                    "text_delta" => {
                        let piece = delta["text"].as_str().unwrap_or_default();
                        let kept = format!("{}{piece}", block["text"].as_str().unwrap_or_default());
                        block["text"] = Value::String(kept);
                        add_text(&mut answer, piece, on_text);
                    }
                    "thinking_delta" => {
                        let kept = format!(
                            "{}{}",
                            block["thinking"].as_str().unwrap_or_default(),
                            delta["thinking"].as_str().unwrap_or_default()
                        );
                        block["thinking"] = Value::String(kept);
                    }
                    "signature_delta" => block["signature"] = delta["signature"].clone(),
                    "input_json_delta" => {
                        if let Some(kept) = inputs.get_mut(&index) {
                            kept.push_str(delta["partial_json"].as_str().unwrap_or_default());
                        }
                    }
                    _ => {}
                }
            }
            "content_block_stop" => {
                if let (Some(text), Some(block)) = (inputs.get(&index), blocks.get_mut(index)) {
                    block["input"] = input_of(text);
                }
            }
            "message_delta" => {
                if let Some(tokens) = event["usage"]["output_tokens"].as_u64() {
                    answer.output_tokens = Some(tokens);
                }
                match event["delta"]["stop_reason"].as_str() {
                    Some("refusal") => answer.stop = Stop::Refused,
                    Some("max_tokens") => answer.stop = Stop::Cut,
                    Some("tool_use") => answer.stop = Stop::Calling,
                    Some(_) => answer.stop = Stop::Finished,
                    None => {}
                }
                stopped |= event["delta"]["stop_reason"].is_string();
            }
            "error" => {
                answer.stop = Stop::Failed;
                answer.problem = Some(error_words(&event));
                return answer;
            }
            _ => {}
        }
    }
    blocks.retain(|b| !b.is_null());
    answer.calls = blocks
        .iter()
        .filter(|b| b["type"] == "tool_use")
        .map(|b| ToolCall {
            id: b["id"].as_str().unwrap_or_default().to_owned(),
            name: b["name"].as_str().unwrap_or_default().to_owned(),
            input: b["input"].clone(),
        })
        .collect();
    answer.assistant = json!({"role": "assistant", "content": blocks});
    finish(answer, stopped)
}

/// Chat completions' stream: text, and each tool call gathered by its index from its pieces.
fn read_openai(reader: impl BufRead, on_text: &mut dyn FnMut(&str)) -> Answer {
    let mut answer = Answer::new();
    let mut stopped = false;
    let mut calls: BTreeMap<u64, (String, String, String)> = BTreeMap::new();
    for data in events(reader) {
        if data.trim() == "[DONE]" {
            break;
        }
        let Ok(event) = serde_json::from_str::<Value>(&data) else { continue };
        if event.get("error").is_some() {
            answer.stop = Stop::Failed;
            answer.problem = Some(error_words(&event));
            return answer;
        }
        let choice = &event["choices"][0];
        add_text(&mut answer, choice["delta"]["content"].as_str().unwrap_or_default(), on_text);
        for call in choice["delta"]["tool_calls"].as_array().map_or(&[][..], Vec::as_slice) {
            let index = call["index"].as_u64().unwrap_or(calls.len() as u64);
            let kept = calls.entry(index).or_insert_with(|| (format!("call_{index}"), String::new(), String::new()));
            if let Some(id) = call["id"].as_str().filter(|id| !id.is_empty()) {
                kept.0 = id.to_owned();
            }
            if let Some(name) = call["function"]["name"].as_str() {
                kept.1.push_str(name);
            }
            match &call["function"]["arguments"] {
                Value::String(piece) => kept.2.push_str(piece),
                Value::Object(_) => kept.2 = call["function"]["arguments"].to_string(),
                _ => {}
            }
        }
        match choice["finish_reason"].as_str() {
            Some("length") => answer.stop = Stop::Cut,
            Some("content_filter") => answer.stop = Stop::Refused,
            Some("tool_calls") => answer.stop = Stop::Calling,
            Some(_) => answer.stop = Stop::Finished,
            None => {}
        }
        stopped |= choice["finish_reason"].is_string();
        if let Some(usage) = event.get("usage").filter(|u| u.is_object()) {
            answer.input_tokens = usage["prompt_tokens"].as_u64();
            answer.output_tokens = usage["completion_tokens"].as_u64();
        }
    }
    answer.calls = calls
        .values()
        .map(|(id, name, args)| ToolCall { id: id.clone(), name: name.clone(), input: input_of(args) })
        .collect();
    if !answer.calls.is_empty() && answer.stop == Stop::Finished {
        answer.stop = Stop::Calling;
    }
    let mut message =
        json!({"role": "assistant", "content": if answer.text.is_empty() { Value::Null } else { json!(answer.text) }});
    if !calls.is_empty() {
        message["tool_calls"] = calls
            .values()
            .map(
                |(id, name, args)| json!({"id": id, "type": "function", "function": {"name": name, "arguments": args}}),
            )
            .collect();
    }
    answer.assistant = message;
    finish(answer, stopped)
}

fn finish(mut answer: Answer, stopped: bool) -> Answer {
    if !stopped && answer.stop == Stop::Finished {
        answer.stop = Stop::Failed;
        answer.problem = Some("The answer ended before the service said it was done.".to_owned());
    }
    if answer.stop != Stop::Calling {
        answer.calls.clear();
    }
    answer
}

/// Reads a streamed answer, handing each piece of text on as it comes.
pub fn read_stream(api: Api, reader: impl BufRead, on_text: &mut dyn FnMut(&str)) -> Answer {
    match api {
        Api::Anthropic => read_anthropic(reader, on_text),
        Api::Openai => read_openai(reader, on_text),
        Api::Program => Answer::failed("a program's answer is read by the program's own reader"),
    }
}

/// The service's own words from an error body, where it gave them.
pub fn error_words(body: &Value) -> String {
    body["error"]["message"]
        .as_str()
        .or_else(|| body["error"].as_str())
        .or_else(|| body["message"].as_str())
        .unwrap_or("the service did not say why")
        .chars()
        .take(600)
        .collect()
}

fn agent() -> ureq::Agent {
    let config = ureq::config::Config::builder()
        .http_status_as_error(false)
        .timeout_connect(Some(CONNECT))
        .timeout_recv_response(Some(FIRST_WORD))
        .timeout_recv_body(Some(WHOLE_ANSWER))
        .build();
    ureq::Agent::new_with_config(config)
}

fn unreachable(service: &Service, problem: &ureq::Error) -> String {
    if service.local() {
        format!("{} could not be reached at {}. Is it running? ({problem})", service.name, service.address)
    } else {
        format!("{} could not be reached: {problem}", service.name)
    }
}

fn status_words(status: u16, reader: impl Read) -> String {
    let mut text = String::new();
    let _ = reader.take(MAX_ERROR_BODY).read_to_string(&mut text);
    let said = serde_json::from_str::<Value>(&text)
        .map(|v| error_words(&v))
        .unwrap_or_else(|_| text.trim().chars().take(300).collect());
    match status {
        401 | 403 => format!("The service did not accept the key ({status}): {said}"),
        404 => format!("The service has no such model, or no such address ({status}): {said}"),
        429 => format!("The service says too many questions or too little credit for now ({status}): {said}"),
        _ => format!("The service answered {status}: {said}"),
    }
}

/// Whether a refusal says the model cannot take the tools it was offered (a 400 naming tools).
pub fn refuses_tools(status: u16, problem: &str) -> bool {
    status == 400 && problem.to_ascii_lowercase().contains("tool")
}

/// Asks one question and streams the answer to `on_text`. A program the person logs in to is started for it (`ai_programs`).
pub fn ask(request: &Request, on_text: &mut dyn FnMut(&str)) -> Answer {
    if request.service.api == Api::Program {
        return crate::ai_programs::ask(request, on_text);
    }
    let mut call = agent().post(endpoint(
        request.service,
        match request.service.api {
            Api::Anthropic => "messages",
            Api::Openai | Api::Program => "chat/completions",
        },
    ));
    for (name, value) in headers(request.service, request.key) {
        call = call.header(name, value);
    }
    let response = match call.send(body(request).to_string()) {
        Ok(response) => response,
        Err(problem) => return Answer::failed(unreachable(request.service, &problem)),
    };
    let status = response.status().as_u16();
    let reader = response.into_body().into_reader();
    if status >= 400 {
        let problem = status_words(status, reader);
        let tools_refused = !request.tools.is_empty() && refuses_tools(status, &problem);
        return Answer { tools_refused, ..Answer::failed(problem) };
    }
    read_stream(request.service.api, BufReader::new(reader), on_text)
}

/// The ids in a models answer, sorted, at most 500.
pub fn model_ids(answer: &Value) -> Vec<String> {
    let mut ids: Vec<String> = answer["data"]
        .as_array()
        .map_or(&[][..], Vec::as_slice)
        .iter()
        .filter_map(|m| m["id"].as_str())
        .filter(|id| !id.is_empty() && id.len() <= 200 && !id.chars().any(char::is_control))
        .map(str::to_owned)
        .collect();
    ids.sort();
    ids.dedup();
    ids.truncate(MAX_MODELS);
    ids
}

/// The service's own list of models; a program's are those its row names.
pub fn list_models(service: &Service, key: Option<&str>) -> Result<Vec<String>, String> {
    if let Some(program) = &service.program {
        return Ok(program.models.clone());
    }
    let path = match service.api {
        Api::Anthropic => "models?limit=1000",
        Api::Openai | Api::Program => "models",
    };
    let mut call = agent().get(endpoint(service, path));
    for (name, value) in headers(service, key) {
        if name != "content-type" {
            call = call.header(name, value);
        }
    }
    let response = call.call().map_err(|problem| unreachable(service, &problem))?;
    let status = response.status().as_u16();
    let reader = response.into_body().into_reader();
    if status >= 400 {
        return Err(status_words(status, reader));
    }
    let mut text = String::new();
    reader.take(MAX_MODELS_BODY).read_to_string(&mut text).map_err(|problem| problem.to_string())?;
    let answer: Value = serde_json::from_str(&text)
        .map_err(|_| format!("{} gave a list of models that could not be read", service.name))?;
    Ok(model_ids(&answer))
}

#[cfg(test)]
#[path = "tests/ai_client.rs"]
mod tests;
