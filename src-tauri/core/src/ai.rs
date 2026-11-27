//! AI services for help on pages (0.71.0; `docs/ai.md`, A2; the owner's choices of 23 Nov 2026). Game-free.
//!
//! **The services are data** (`config/ai-services.json`), checked here before any is used. A service at a loopback address runs on
//! this computer: nothing leaves it, it needs no key, and no Going online switch applies. Any other is a call to the internet: it
//! runs only while **AI services** is on in Settings → Going online (it starts off), only with a key, and only on the person's press
//! after they were shown exactly what goes. The person's choices (service, model, answer length) are kept in `ai.json`, and each
//! answer's token count is appended to `ai-usage.jsonl`, both in the program's own folder.
//!
//! **A program the person logs in to** (0.115.0; `docs/ai.md`, A4; the owner's choices of 28 Nov 2026) is the third kind: Claude
//! Code, Codex or Gemini CLI, installed and logged in to by the person, started for one answer with its tools off
//! (`ai_programs`). It needs no key and charges nothing per question, but it goes online, so it runs only while AI services is
//! on, and only when it is found on this computer. **The Companion never holds, reads or passes its login**; its own login check
//! is read for three facts only, and kept in memory for this run.

use crate::ai_keys::{self, KeySource, Secrets};
use crate::failure::Failure;
use crate::{online, prefs, time};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::io::Write;
use std::path::Path;
use std::sync::{Mutex, OnceLock};

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
    /// A program the person logs in to (0.115.0), started for one answer (`ai_programs`).
    Program,
}

/// How a program's answer is read (0.115.0): Claude Code's `stream-json`, Codex's `exec --json`, Gemini CLI's `stream-json`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Reads {
    ClaudeStream,
    CodexJson,
    GeminiStream,
}

/// How a program's own login check is read: Claude Code's `auth status` JSON, or Codex's `login status` exit code and words.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LoginReads {
    ClaudeAuth,
    CodexStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LoginCheck {
    pub args: Vec<String>,
    pub reads: LoginReads,
}

/// A program the person installed and logged in to, as its row in the services file describes it (0.115.0).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Program {
    /// Its name on the search path, found as a shell finds it.
    pub command: String,
    /// Its arguments, with the placeholders [`INSTRUCTION_FILE`] and [`MODEL_ARGS`].
    pub args: Vec<String>,
    /// The arguments that name a model, with [`MODEL`]; left out for the program's own choice.
    #[serde(default)]
    pub model_args: Vec<String>,
    pub reads: Reads,
    /// Variables taken out of its environment, so a key there never makes it charge per use.
    #[serde(default)]
    pub drop_variables: Vec<String>,
    /// The models it may be asked for: [`OWN_CHOICE`] first where it has a default.
    pub models: Vec<String>,
    #[serde(default)]
    pub login: Option<LoginCheck>,
    /// Where to get it, in words.
    pub get: String,
    /// Whether it has been tried with the Companion.
    #[serde(default)]
    pub tried: bool,
}

/// A program's argument that becomes the path of a file holding the instruction.
pub const INSTRUCTION_FILE: &str = "{instruction-file}";
/// A program's argument that becomes its `modelArgs`, or nothing for its own choice of model.
pub const MODEL_ARGS: &str = "{model-args}";
/// The chosen model's name, inside `modelArgs`.
pub const MODEL: &str = "{model}";
/// The model a program chooses for itself.
pub const OWN_CHOICE: &str = "default";

/// The three kinds Settings lists, in its order: on this computer, a program the person logs in to, a service charged per use.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Local,
    Program,
    Key,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Service {
    pub id: String,
    pub name: String,
    pub api: Api,
    #[serde(default)]
    pub address: String,
    pub key_variable: Option<String>,
    #[serde(default)]
    pub stream_usage: bool,
    #[serde(default)]
    pub program: Option<Program>,
}

impl Service {
    /// Whether it runs on this computer. A program runs here but sends the question online, so it is not.
    pub fn local(&self) -> bool {
        self.program.is_none() && is_loopback(&self.address)
    }

    pub fn kind(&self) -> Kind {
        if self.program.is_some() {
            Kind::Program
        } else if self.local() {
            Kind::Local
        } else {
            Kind::Key
        }
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

fn variable_name(variable: &str) -> bool {
    !variable.is_empty() && variable.bytes().all(|b| b.is_ascii_uppercase() || b.is_ascii_digit() || b == b'_')
}

/// A program's name as the search path holds it: letters, digits, `.`, `_` and `-`, not starting with `-` or `.`.
fn program_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 40
        && !name.starts_with(['-', '.'])
        && name.bytes().all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'_' | b'-'))
}

/// One argument: one line of a sane length, and a placeholder only where it is the whole argument.
fn plain_argument(argument: &str, placeholders: &[&str]) -> bool {
    argument.len() <= 200
        && !argument.chars().any(char::is_control)
        && (!argument.contains(['{', '}']) || placeholders.contains(&argument))
}

/// A program's row: a plain name, plain arguments with each placeholder at most once, `{model}` in its model arguments when it
/// has any, a model list of plain names, variables named as variables, a login check of plain words, and where to get it.
fn checked_program(program: &Program) -> bool {
    let once = |placeholder: &str| program.args.iter().filter(|a| *a == placeholder).count() <= 1;
    let models_ok = !program.models.is_empty()
        && program.models.iter().enumerate().all(|(index, model)| {
            checked_model(model).is_ok_and(|m| m == *model) && !program.models[..index].contains(model)
        });
    let model_args_ok = program.model_args.is_empty()
        || (program.model_args.iter().filter(|a| *a == MODEL).count() == 1
            && program.model_args.iter().all(|a| plain_argument(a, &[MODEL])));
    program_name(&program.command)
        && program.args.iter().all(|a| plain_argument(a, &[INSTRUCTION_FILE, MODEL_ARGS]))
        && once(INSTRUCTION_FILE)
        && once(MODEL_ARGS)
        && model_args_ok
        && models_ok
        && program.drop_variables.iter().all(|v| variable_name(v))
        && program.login.as_ref().is_none_or(|login| login.args.iter().all(|a| plain_argument(a, &[]) && a.len() <= 40))
        && !program.get.trim().is_empty()
}

/// The services a file lists, each checked: a plain id once, a name, and then by its kind. A service with an address: https
/// unless it runs on this computer, and a key variable of capitals, digits and _ exactly when it is not local. A program
/// (0.115.0): no address and no key, and a row [`checked_program`] accepts.
pub fn checked_services(text: &str) -> Result<Vec<Service>, String> {
    let file: Value = serde_json::from_str(text).map_err(|e| format!("the services file could not be read: {e}"))?;
    let services: Vec<Service> =
        serde_json::from_value(file["services"].clone()).map_err(|e| format!("a service could not be read: {e}"))?;
    let mut seen = Vec::new();
    for service in &services {
        let usable = match (service.api, &service.program) {
            (Api::Program, Some(program)) => {
                service.address.is_empty()
                    && service.key_variable.is_none()
                    && !service.stream_usage
                    && checked_program(program)
            }
            (Api::Program, None) | (_, Some(_)) => false,
            _ => {
                let local = service.local();
                let secure =
                    service.address.starts_with("https://") || (local && service.address.starts_with("http://"));
                let key_ok = match &service.key_variable {
                    Some(variable) => !local && variable_name(variable),
                    None => local,
                };
                secure && key_ok
            }
        };
        if !plain_id(&service.id) || seen.contains(&service.id) || service.name.trim().is_empty() || !usable {
            return Err(format!("the service {:?} is not one the program can use", service.id));
        }
        seen.push(service.id.clone());
    }
    Ok(services)
}

/// Whether a program is on this computer's search path.
pub fn program_found(program: &Program) -> bool {
    crate::acp::find_on_path(&program.command).is_some()
}

/// How a program said it is logged in.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LoginHow {
    /// With the person's own plan: nothing is charged per question.
    Plan,
    /// With a key: the program charges per question.
    Key,
    /// It did not say how.
    Unknown,
}

/// What a program's own login check said (0.115.0): only these three facts are read from it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Login {
    pub logged_in: bool,
    pub how: LoginHow,
    /// The plan's name as the program gave it (a word such as `max`), where it gave one.
    pub plan: Option<String>,
}

/// Each program's last login check in this run, by service id. Never written anywhere.
static LOGINS: Mutex<BTreeMap<String, Login>> = Mutex::new(BTreeMap::new());

/// A program's last login check in this run.
pub fn login_of(id: &str) -> Option<Login> {
    LOGINS.lock().ok().and_then(|logins| logins.get(id).cloned())
}

fn keep_login(id: &str, login: Login) {
    if let Ok(mut logins) = LOGINS.lock() {
        logins.insert(id.to_owned(), login);
    }
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
    /// Which of Settings' three groups it is in (0.115.0).
    pub kind: Kind,
    pub needs_key: bool,
    pub key: KeySource,
    pub model: Option<String>,
    /// For a program: whether it is on this computer's search path. Always true for the other kinds.
    pub found: bool,
    /// For a program: where to get it, in words.
    pub get: Option<String>,
    /// For a program: whether it has been tried with the Companion. Always true for the other kinds.
    pub tried: bool,
    /// For a program: what its own login check said, when it was last looked at in this run.
    pub login: Option<Login>,
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
            kind: s.kind(),
            needs_key: s.key_variable.is_some(),
            key: ai_keys::find(s, env, secrets).1,
            model: choices.models.get(&s.id).cloned(),
            found: s.program.as_ref().is_none_or(program_found),
            get: s.program.as_ref().map(|p| p.get.clone()),
            tried: s.program.as_ref().is_none_or(|p| p.tried),
            login: s.program.as_ref().and_then(|_| login_of(&s.id)),
        })
        .collect();
    let ready = choices.service.as_ref().and_then(|id| found.iter().find(|s| &s.id == id)).is_some_and(|s| {
        s.model.is_some()
            && match s.kind {
                Kind::Local => true,
                Kind::Program => online_on && s.found,
                Kind::Key => online_on && s.key != KeySource::None,
            }
    });
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

/// A program (0.115.0) is asked only for a model its row names: the name goes on its command line.
fn offered(service: &Service, model: &str) -> Result<(), Failure> {
    match &service.program {
        Some(program) if !program.models.iter().any(|m| m == model) => {
            Err(Failure::refused(format!("{} offers no model {model:?}: choose one in Settings → AI", service.name)))
        }
        _ => Ok(()),
    }
}

pub fn choose_model(data: &Path, id: &str, model: &str) -> Result<Status, Failure> {
    let service = service(id)?;
    let model = checked_model(model)?;
    offered(service, &model)?;
    let mut choices = read_choices(data);
    choices.models.insert(id.to_owned(), model);
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

/// The gate before any call to a service: on this computer always; online only while AI services is on, and then a service
/// charged per use only with a key, and a program (0.115.0) only when it is on this computer.
pub fn allowed(data: &Path, service: &Service, key: Option<&str>) -> Result<(), Failure> {
    if service.local() {
        return Ok(());
    }
    if !online::is_on(data, ONLINE_KIND) {
        return Err(Failure::refused("AI services is switched off in Settings → Going online"));
    }
    if let Some(program) = &service.program {
        if !program_found(program) {
            return Err(Failure::refused(format!("{} is not on this computer. {}", service.name, program.get)));
        }
        return Ok(());
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
    offered(service, &model)?;
    let key = ai_keys::find(service, &environment, &ai_keys::SystemSecrets).0;
    allowed(data, service, key.as_deref())?;
    Ok(Ready { service, model, key, length: choices.length, tools: !choices.tools_off })
}

/// The service's own list of models, through the same gate as a question. For a program (0.115.0), the models its row names,
/// after its own login check, where it has one: what that said is kept for this run, so Settings can show it.
pub fn models(data: &Path, id: &str) -> Result<Vec<String>, Failure> {
    let service = service(id)?;
    if let Some(program) = &service.program {
        if !program_found(program) {
            return Err(Failure::refused(format!("{} is not on this computer. {}", service.name, program.get)));
        }
        if program.login.is_some() {
            let login = crate::ai_programs::login(service).map_err(Failure::refused)?;
            keep_login(id, login);
        }
        return Ok(program.models.clone());
    }
    let key = ai_keys::find(service, &environment, &ai_keys::SystemSecrets).0;
    allowed(data, service, key.as_deref())?;
    crate::ai_client::list_models(service, key.as_deref()).map_err(Failure::refused)
}

#[cfg(test)]
#[path = "tests/ai.rs"]
mod tests;
