//! Asking an AI service (0.71.0; `docs/ai.md`, A2): the request each kind of API takes, reading its answer as it streams, and its
//! list of models. Two kinds: Claude's own Messages API (`anthropic`; Rust has no official Anthropic library, so this is plain
//! HTTPS, as Anthropic documents it), and the chat completions API that OpenAI, Gemini, Ollama, LM Studio and most others offer
//! (`openai`). The model is given **no tools**: text in a log aimed at a model can make an answer wrong, never make anything happen.
//! An answer is text to show, never anything to act on.

use crate::ai::{Api, Service};
use serde::Serialize;
use serde_json::{Value, json};
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

/// One question for one model.
pub struct Request<'a> {
    pub service: &'a Service,
    pub key: Option<&'a str>,
    pub model: &'a str,
    pub system: &'a str,
    pub user: &'a str,
    pub max_tokens: u32,
}

/// How an answer ended.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Stop {
    /// It said all it meant to.
    Finished,
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
}

impl Answer {
    fn failed(problem: impl Into<String>) -> Self {
        Self {
            text: String::new(),
            stop: Stop::Failed,
            problem: Some(problem.into()),
            input_tokens: None,
            output_tokens: None,
        }
    }
}

/// The request's JSON body.
pub fn body(request: &Request) -> Value {
    match request.service.api {
        Api::Anthropic => json!({
            "model": request.model,
            "max_tokens": request.max_tokens,
            "stream": true,
            "system": request.system,
            "messages": [{"role": "user", "content": request.user}],
        }),
        Api::Openai => {
            let mut body = json!({
                "model": request.model,
                "stream": true,
                "messages": [
                    {"role": "system", "content": request.system},
                    {"role": "user", "content": request.user},
                ],
            });
            if request.service.stream_usage {
                body["stream_options"] = json!({"include_usage": true});
            }
            body
        }
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
        (Api::Openai, None) => {}
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

/// Reads a streamed answer, handing each piece of text on as it comes.
pub fn read_stream(api: Api, reader: impl BufRead, on_text: &mut dyn FnMut(&str)) -> Answer {
    let mut answer =
        Answer { text: String::new(), stop: Stop::Finished, problem: None, input_tokens: None, output_tokens: None };
    let mut stopped = false;
    for data in events(reader) {
        if api == Api::Openai && data.trim() == "[DONE]" {
            break;
        }
        let Ok(event) = serde_json::from_str::<Value>(&data) else { continue };
        let mut add = |text: &str, answer: &mut Answer| {
            if !text.is_empty() && answer.text.len() < MAX_ANSWER {
                answer.text.push_str(text);
                on_text(text);
            }
        };
        match api {
            Api::Anthropic => match event["type"].as_str().unwrap_or_default() {
                "message_start" => answer.input_tokens = event["message"]["usage"]["input_tokens"].as_u64(),
                "content_block_delta" if event["delta"]["type"] == "text_delta" => {
                    add(event["delta"]["text"].as_str().unwrap_or_default(), &mut answer)
                }
                "message_delta" => {
                    if let Some(tokens) = event["usage"]["output_tokens"].as_u64() {
                        answer.output_tokens = Some(tokens);
                    }
                    match event["delta"]["stop_reason"].as_str() {
                        Some("refusal") => answer.stop = Stop::Refused,
                        Some("max_tokens") => answer.stop = Stop::Cut,
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
            },
            Api::Openai => {
                if event.get("error").is_some() {
                    answer.stop = Stop::Failed;
                    answer.problem = Some(error_words(&event));
                    return answer;
                }
                let choice = &event["choices"][0];
                add(choice["delta"]["content"].as_str().unwrap_or_default(), &mut answer);
                match choice["finish_reason"].as_str() {
                    Some("length") => answer.stop = Stop::Cut,
                    Some("content_filter") => answer.stop = Stop::Refused,
                    Some(_) => answer.stop = Stop::Finished,
                    None => {}
                }
                stopped |= choice["finish_reason"].is_string();
                if let Some(usage) = event.get("usage").filter(|u| u.is_object()) {
                    answer.input_tokens = usage["prompt_tokens"].as_u64();
                    answer.output_tokens = usage["completion_tokens"].as_u64();
                }
            }
        }
    }
    if !stopped && answer.stop == Stop::Finished {
        answer.stop = Stop::Failed;
        answer.problem = Some("The answer ended before the service said it was done.".to_owned());
    }
    answer
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

/// Asks one question and streams the answer to `on_text`.
pub fn ask(request: &Request, on_text: &mut dyn FnMut(&str)) -> Answer {
    let mut call = agent().post(endpoint(
        request.service,
        match request.service.api {
            Api::Anthropic => "messages",
            Api::Openai => "chat/completions",
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
        return Answer::failed(status_words(status, reader));
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

/// The service's own list of models.
pub fn list_models(service: &Service, key: Option<&str>) -> Result<Vec<String>, String> {
    let path = match service.api {
        Api::Anthropic => "models?limit=1000",
        Api::Openai => "models",
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
