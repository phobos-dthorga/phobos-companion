//! AI services for help on pages (0.71.0; `docs/ai.md`, A2; the owner's choices of 23 Nov 2026). Game-free.
//!
//! **The services are data** (`config/ai-services.json`), checked here before any is used. A service at a loopback address runs on
//! this computer: nothing leaves it, it needs no key, and no Going online switch applies. Any other is a call to the internet: it
//! runs only while **AI services** is on in Settings → Going online (it starts off), only with a key, and only on the person's press
//! after they were shown exactly what goes. The person's choices (service, model, answer length) are kept in `ai.json`, and each
//! answer's token count is appended to `ai-usage.jsonl`, both in the program's own folder.

use crate::ai_keys::{self, KeySource, Secrets};
use crate::failure::Failure;
use crate::{online, prefs, time};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::io::Write;
use std::path::Path;
use std::sync::OnceLock;

/// The kind of going online an AI service's call is (`online::KINDS`).
pub const ONLINE_KIND: &str = "ai-services";
const SERVICES: &str = include_str!("../../../config/ai-services.json");
const CHOICES: &str = "ai.json";
const USAGE: &str = "ai-usage.jsonl";
const VERSION: u64 = 1;
const MAX_MODEL: usize = 200;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Api {
    Anthropic,
    Openai,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Service {
    pub id: String,
    pub name: String,
    pub api: Api,
    pub address: String,
    pub key_variable: Option<String>,
    #[serde(default)]
    pub stream_usage: bool,
}

impl Service {
    /// Whether it runs on this computer.
    pub fn local(&self) -> bool {
        is_loopback(&self.address)
    }
}

/// Whether an address is this computer's own: 127.0.0.1, localhost or ::1.
pub fn is_loopback(address: &str) -> bool {
    let Some(rest) = address.strip_prefix("http://").or_else(|| address.strip_prefix("https://")) else {
        return false;
    };
    let authority = rest.split(['/', '?', '#']).next().unwrap_or_default();
    let host = match authority.strip_prefix('[') {
        Some(bracketed) => bracketed.split(']').next().unwrap_or_default(),
        None => authority.rsplit_once(':').map_or(authority, |(host, _)| host),
    };
    matches!(host.to_ascii_lowercase().as_str(), "127.0.0.1" | "localhost" | "::1")
}

fn plain_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 40 && id.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

/// The services a file lists, each checked: a plain id once, a name, https unless it runs on this computer, and a key variable of
/// capitals, digits and _ exactly when it is not local.
pub fn checked_services(text: &str) -> Result<Vec<Service>, String> {
    let file: Value = serde_json::from_str(text).map_err(|e| format!("the services file could not be read: {e}"))?;
    let services: Vec<Service> =
        serde_json::from_value(file["services"].clone()).map_err(|e| format!("a service could not be read: {e}"))?;
    let mut seen = Vec::new();
    for service in &services {
        let local = service.local();
        let secure = service.address.starts_with("https://") || (local && service.address.starts_with("http://"));
        let key_ok = match &service.key_variable {
            Some(variable) => {
                !local
                    && !variable.is_empty()
                    && variable.bytes().all(|b| b.is_ascii_uppercase() || b.is_ascii_digit() || b == b'_')
            }
            None => local,
        };
        if !plain_id(&service.id) || seen.contains(&service.id) || service.name.trim().is_empty() || !secure || !key_ok
        {
            return Err(format!("the service {:?} is not one the program can use", service.id));
        }
        seen.push(service.id.clone());
    }
    Ok(services)
}

/// The services this program knows.
pub fn services() -> &'static [Service] {
    static FOUND: OnceLock<Vec<Service>> = OnceLock::new();
    FOUND.get_or_init(|| checked_services(SERVICES).unwrap_or_default())
}

pub fn service(id: &str) -> Result<&'static Service, Failure> {
    services()
        .iter()
        .find(|s| s.id == id)
        .ok_or_else(|| Failure::refused(format!("\"{id}\" is not an AI service this program knows")))
}

/// How long an answer may be: a preset, with its words for the instruction and its most tokens.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Length {
    #[default]
    Short,
    Medium,
    Long,
}

impl Length {
    /// The words put into an instruction for this length.
    pub fn words(self) -> &'static str {
        match self {
            Length::Short => "under 150 words",
            Length::Medium => "under 350 words",
            Length::Long => "under 800 words",
        }
    }

    /// The most tokens a Claude answer may use, thinking included, so a long answer is never cut short by the ceiling alone.
    pub fn max_tokens(self) -> u32 {
        match self {
            Length::Short => 4_000,
            Length::Medium => 8_000,
            Length::Long => 16_000,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
struct Choices {
    service: Option<String>,
    models: BTreeMap<String, String>,
    length: Length,
    /// Whether the person switched off the tool kit's reports for the model (0.73.0); they start on.
    tools_off: bool,
}

fn read_choices(data: &Path) -> Choices {
    let Ok(Some(file)) = prefs::read_json(&data.join(CHOICES)) else { return Choices::default() };
    Choices {
        service: file["service"].as_str().filter(|id| services().iter().any(|s| s.id == *id)).map(str::to_owned),
        models: file["models"]
            .as_object()
            .map(|m| m.iter().filter_map(|(k, v)| Some((k.clone(), v.as_str()?.to_owned()))).collect())
            .unwrap_or_default(),
        length: serde_json::from_value(file["length"].clone()).unwrap_or_default(),
        tools_off: file["tools"].as_bool() == Some(false),
    }
}

fn write_choices(data: &Path, choices: &Choices) -> Result<(), Failure> {
    let file = json!({"version": VERSION, "service": choices.service, "models": choices.models, "length": choices.length,
                      "tools": !choices.tools_off});
    prefs::write_json(&data.join(CHOICES), &file)
}

/// A model's name as a service gave it: one line of a sane length.
pub fn checked_model(model: &str) -> Result<String, Failure> {
    let model = model.trim();
    if model.is_empty() || model.len() > MAX_MODEL || model.chars().any(char::is_control) {
        return Err(Failure::refused("that is not a model's name"));
    }
    Ok(model.to_owned())
}

/// Each answer's tokens this month, from the usage file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Month {
    pub month: String,
    pub answers: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
}

pub fn month_of(data: &Path, month: &str) -> Month {
    let mut found = Month { month: month.to_owned(), ..Month::default() };
    let Ok(text) = std::fs::read_to_string(data.join(USAGE)) else { return found };
    for line in text.lines() {
        let Ok(record) = serde_json::from_str::<Value>(line) else { continue };
        if record["time"].as_str().is_some_and(|t| t.starts_with(month)) {
            found.answers += 1;
            found.input_tokens += record["input"].as_u64().unwrap_or(0);
            found.output_tokens += record["output"].as_u64().unwrap_or(0);
        }
    }
    found
}

/// Appends one answer's count: when, which service and model, what it was for, and the tokens the service counted.
pub fn record_usage(
    data: &Path,
    service: &str,
    model: &str,
    what: &str,
    input: Option<u64>,
    output: Option<u64>,
) -> Result<(), Failure> {
    let line = json!({"time": time::now_utc(), "service": service, "model": model, "what": what, "input": input, "output": output});
    std::fs::create_dir_all(data).map_err(|e| Failure::refused(format!("the count could not be kept: {e}")))?;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(data.join(USAGE))
        .map_err(|e| Failure::refused(format!("the count could not be kept: {e}")))?;
    writeln!(file, "{line}").map_err(|e| Failure::refused(format!("the count could not be kept: {e}")))
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceStatus {
    pub id: String,
    pub name: String,
    pub api: Api,
    pub local: bool,
    pub needs_key: bool,
    pub key: KeySource,
    pub model: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub services: Vec<ServiceStatus>,
    pub chosen: Option<String>,
    pub length: Length,
    /// Whether the model may ask the tool kit's reports while it answers (0.73.0; on until the person switches it off).
    pub tools: bool,
    /// Whether AI services is on in Settings → Going online.
    pub online_on: bool,
    /// The key store's name, or None when this computer has none the program can use.
    pub key_store: Option<String>,
    /// Ready to ask: a service and its model chosen, and its key and switch in place.
    pub ready: bool,
    pub month: Month,
}

fn environment(variable: &str) -> Option<String> {
    std::env::var(variable).ok()
}

/// Everything the Settings panel shows.
pub fn status(data: &Path) -> Status {
    status_with(data, &environment, &ai_keys::SystemSecrets)
}

pub fn status_with(data: &Path, env: &dyn Fn(&str) -> Option<String>, secrets: &dyn Secrets) -> Status {
    let choices = read_choices(data);
    let online_on = online::is_on(data, ONLINE_KIND);
    let found: Vec<ServiceStatus> = services()
        .iter()
        .map(|s| ServiceStatus {
            id: s.id.clone(),
            name: s.name.clone(),
            api: s.api,
            local: s.local(),
            needs_key: s.key_variable.is_some(),
            key: ai_keys::find(s, env, secrets).1,
            model: choices.models.get(&s.id).cloned(),
        })
        .collect();
    let ready = choices
        .service
        .as_ref()
        .and_then(|id| found.iter().find(|s| &s.id == id))
        .is_some_and(|s| s.model.is_some() && (s.local || (online_on && s.key != KeySource::None)));
    Status {
        services: found,
        chosen: choices.service,
        length: choices.length,
        tools: !choices.tools_off,
        online_on,
        key_store: secrets.name().map(str::to_owned),
        ready,
        month: month_of(data, &time::now_utc()[..7]),
    }
}

pub fn choose_service(data: &Path, id: &str) -> Result<Status, Failure> {
    service(id)?;
    let mut choices = read_choices(data);
    choices.service = Some(id.to_owned());
    write_choices(data, &choices)?;
    Ok(status(data))
}

pub fn choose_model(data: &Path, id: &str, model: &str) -> Result<Status, Failure> {
    service(id)?;
    let mut choices = read_choices(data);
    choices.models.insert(id.to_owned(), checked_model(model)?);
    write_choices(data, &choices)?;
    Ok(status(data))
}

pub fn choose_length(data: &Path, length: Length) -> Result<Status, Failure> {
    let mut choices = read_choices(data);
    choices.length = length;
    write_choices(data, &choices)?;
    Ok(status(data))
}

/// Keeps whether the model may ask the tool kit's reports while it answers (0.73.0).
pub fn choose_tools(data: &Path, on: bool) -> Result<Status, Failure> {
    let mut choices = read_choices(data);
    choices.tools_off = !on;
    write_choices(data, &choices)?;
    Ok(status(data))
}

/// Keeps a key the person typed for a service, in the operating system's key store.
pub fn keep_key(data: &Path, id: &str, key: &str) -> Result<Status, Failure> {
    ai_keys::keep(service(id)?, key, &ai_keys::SystemSecrets).map_err(Failure::refused)?;
    Ok(status(data))
}

/// Forgets a service's kept key.
pub fn forget_key(data: &Path, id: &str) -> Result<Status, Failure> {
    ai_keys::forget(service(id)?, &ai_keys::SystemSecrets).map_err(Failure::refused)?;
    Ok(status(data))
}

/// The gate before any call to a service: on this computer always; online only while AI services is on, and only with a key.
pub fn allowed(data: &Path, service: &Service, key: Option<&str>) -> Result<(), Failure> {
    if service.local() {
        return Ok(());
    }
    if !online::is_on(data, ONLINE_KIND) {
        return Err(Failure::refused("AI services is switched off in Settings → Going online"));
    }
    if key.is_none() {
        return Err(Failure::refused(format!("there is no key for {} yet: add one in Settings → AI", service.name)));
    }
    Ok(())
}

/// What a question needs: the chosen service and model, its key, and the answer length; refused, in words, until all are there.
pub struct Ready {
    pub service: &'static Service,
    pub model: String,
    pub key: Option<String>,
    pub length: Length,
    /// Whether the model may ask the tool kit's reports.
    pub tools: bool,
}

pub fn ready(data: &Path) -> Result<Ready, Failure> {
    let choices = read_choices(data);
    let id =
        choices.service.ok_or_else(|| Failure::refused("no AI service is chosen yet: choose one in Settings → AI"))?;
    let service = service(&id)?;
    let model = choices.models.get(&id).cloned().ok_or_else(|| {
        Failure::refused(format!("no model of {} is chosen yet: choose one in Settings → AI", service.name))
    })?;
    let key = ai_keys::find(service, &environment, &ai_keys::SystemSecrets).0;
    allowed(data, service, key.as_deref())?;
    Ok(Ready { service, model, key, length: choices.length, tools: !choices.tools_off })
}

/// The service's own list of models, through the same gate as a question.
pub fn models(data: &Path, id: &str) -> Result<Vec<String>, Failure> {
    let service = service(id)?;
    let key = ai_keys::find(service, &environment, &ai_keys::SystemSecrets).0;
    allowed(data, service, key.as_deref())?;
    crate::ai_client::list_models(service, key.as_deref()).map_err(Failure::refused)
}

#[cfg(test)]
#[path = "tests/ai.rs"]
mod tests;
