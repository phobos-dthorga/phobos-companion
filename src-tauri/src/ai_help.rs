//! Help on pages from an AI service (0.71.0; `docs/ai.md`, A2; the owner's choice of 23 Nov 2026: "shown first, then my press").
//!
//! A question is asked in two steps. **Prepare** builds exactly what would be sent, from what the host itself read (a fault the Logs
//! page's last reading named, by its id; since 0.72.0 also a version of a changelog the Changes page last read, and a repository's
//! last update check) and an instruction file kept with the program (`prompts/`), and shows it whole, with the service and model it
//! would go to. **Send** sends that and nothing else, only for the question last prepared, and checks the
//! service's gate again (`companion_core::ai::ready`). Its answer is text to show.
//!
//! **The tool kit's reports** (0.73.0, slice 3b): unless the person switched it off, the model may ask the kit's three read-only
//! tools while it answers (`ai_tools`), at most six times a question. For a model on this computer each report runs and is sent at
//! once, and the card lists it. **For an online model each report runs here first and waits, shown whole, for the person's yes**
//! (`Step::Waiting`, then `answer_call`): only then is it sent; a no tells the model it was declined.
//!
//! **A program the person logs in to** (0.115.0, `docs/ai.md`, A4) is asked the same way: `ai_client::ask` starts it for each
//! turn. It is not on this computer in the sense that matters (it sends the question online), so each report waits for a yes.

use crate::{ai_tools, changes_page, logs_page, other_code_page};
use companion_core::ai::{self, Kind, Length, LoginHow};
use companion_core::ai_client::{self, Answer, Request, Stop, Tool, ToolCall};
use companion_core::failure::Failure;
use companion_core::games;
use serde::Serialize;
use serde_json::Value;
use std::path::Path;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};

const EXPLAIN_FAULT: &str = include_str!("../../prompts/explain-fault.md");
const EXPLAIN_FAULT_WHAT: &str = "explain-fault";
const SUMMARISE_VERSION: &str = include_str!("../../prompts/summarise-version.md");
const SUMMARISE_VERSION_WHAT: &str = "summarise-version";
const UPDATE_MEANING: &str = include_str!("../../prompts/update-meaning.md");
const UPDATE_MEANING_WHAT: &str = "update-meaning";
const TOOLS: &str = include_str!("../../prompts/tools.md");
/// The most reports the model may ask for in one question (agent default).
pub const MAX_CALLS: usize = 6;
const TOO_MANY: &str = "No more reports can be asked for this question ({calls} at most): answer with what you have.";
const DECLINED: &str = "The person chose not to send this report's answer. Answer without it.";
const MAX_TEXT: usize = 12_000;
const MAX_ENTRIES: usize = 60;
const MAX_ROWS: usize = 30;
const MAX_BODY_LINES: usize = 40;
const MAX_FRAMES: usize = 25;
const MAX_CLUES: usize = 10;

/// What a press of Send would send, shown first.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Prepared {
    pub id: u64,
    pub what: String,
    pub service: String,
    pub model: String,
    /// Whether it stays on this computer.
    pub local: bool,
    /// Which kind of service answers (0.115.0): on this computer, a program the person logs in to, or one charged per use.
    pub kind: Kind,
    /// Whether this question is charged per use: a service with a key, or a program whose own login check said it uses a key.
    pub charged: bool,
    /// Whether the model may ask the tool kit's reports.
    pub tools: bool,
    pub instruction: String,
    pub text: String,
    pub characters: usize,
}

static NEXT: AtomicU64 = AtomicU64::new(1);
static PENDING: Mutex<Option<Conversation>> = Mutex::new(None);

/// The instruction file with its length filled in.
pub fn instruction(template: &str, length: Length) -> String {
    template.replace("{length}", length.words()).trim().to_owned()
}

fn cut(text: String) -> String {
    if text.chars().count() <= MAX_TEXT {
        return text;
    }
    let kept: String = text.chars().take(MAX_TEXT).collect();
    format!("{kept}\n[The rest is left out: the fault is longer than {MAX_TEXT} characters.]")
}

/// One fault as words for a model: the game, how often, the message, the stack and what points at a mod. Only the fields the log
/// reader gave; nothing the window sent.
pub fn fault_text(game: &str, fault: &Value) -> String {
    let mut lines = vec![format!("Game: {game}")];
    let level = fault["level"].as_str().unwrap_or("Message");
    let count = fault["count"].as_u64().unwrap_or(1);
    let (first, last) = (fault["first"]["line"].as_u64().unwrap_or(0), fault["last"]["line"].as_u64().unwrap_or(0));
    lines.push(format!("Level: {level}. Seen {count} times in the log, first at line {first}, last at line {last}."));
    lines.push(String::new());
    lines.push("Message:".to_owned());
    lines.push(fault["example"]["headline"].as_str().unwrap_or_default().to_owned());
    let body = fault["example"]["body"].as_array().map_or(&[][..], Vec::as_slice);
    lines.extend(body.iter().take(MAX_BODY_LINES).filter_map(Value::as_str).map(str::to_owned));
    if body.len() > MAX_BODY_LINES {
        lines.push(format!("[{} more lines left out]", body.len() - MAX_BODY_LINES));
    }
    let frames = fault["frames"].as_array().map_or(&[][..], Vec::as_slice);
    if !frames.is_empty() {
        lines.push(String::new());
        lines.push("Stack, nearest the fault first:".to_owned());
        for frame in frames.iter().take(MAX_FRAMES) {
            let mut line = format!("- {}", frame["method"].as_str().unwrap_or("?"));
            if let Some(file) = frame["file"].as_str().filter(|f| !f.is_empty()) {
                line.push_str(&format!(" ({file}:{})", frame["line"].as_u64().unwrap_or(0)));
            }
            if let Some(assembly) = frame["assembly"].as_str().filter(|a| !a.is_empty()) {
                line.push_str(&format!(" in {assembly}"));
            }
            lines.push(line);
        }
    }
    let clues = fault["evidence"].as_array().map_or(&[][..], Vec::as_slice);
    if !clues.is_empty() {
        lines.push(String::new());
        lines.push("What points at a mod, strongest first:".to_owned());
        for clue in clues.iter().take(MAX_CLUES) {
            let named = clue["mod"].as_str().filter(|m| !m.is_empty()).unwrap_or("no mod named");
            lines.push(format!(
                "- {named} ({}: {}), in {} messages",
                clue["kind"].as_str().unwrap_or_default(),
                clue["value"].as_str().unwrap_or_default(),
                clue["messages"].as_u64().unwrap_or(0)
            ));
        }
    }
    cut(lines.join("\n"))
}

/// One version of a changelog as words for a model: the product, the version, its heading and summary, and its entries by section.
pub fn version_text(product: &str, changelog: &str, version: &Value) -> String {
    let mut lines = vec![format!("Product: {product} (its changelog: {changelog})")];
    let mut head = format!("Version: {}", version["version"].as_str().unwrap_or("?"));
    if let Some(heading) = version["heading"].as_str().filter(|h| !h.is_empty()) {
        head.push_str(&format!(" ({heading})"));
    }
    lines.push(head);
    if let Some(summary) = version["summary"].as_str().filter(|s| !s.is_empty()) {
        lines.push(String::new());
        lines.push(summary.to_owned());
    }
    let entries = version["entries"].as_array().map_or(&[][..], Vec::as_slice);
    let mut section = None;
    for entry in entries.iter().take(MAX_ENTRIES) {
        let this = entry["section"].as_str().unwrap_or_default();
        if section != Some(this) {
            lines.push(String::new());
            lines.push(if this.is_empty() { "Changes:".to_owned() } else { format!("{this}:") });
            section = Some(this);
        }
        lines.push(format!("- {}", entry["text"].as_str().unwrap_or_default()));
    }
    if entries.len() > MAX_ENTRIES {
        lines.push(format!("[{} more entries left out]", entries.len() - MAX_ENTRIES));
    }
    cut(lines.join("\n"))
}

fn cell(value: &Value) -> String {
    match value {
        Value::String(text) => text.clone(),
        Value::Null => String::new(),
        other => other.to_string(),
    }
}

fn cells(value: &Value) -> Vec<String> {
    value.as_array().map_or(&[][..], Vec::as_slice).iter().map(cell).collect()
}

fn block_text(block: &Value, lines: &mut Vec<String>) {
    match block["type"].as_str().unwrap_or_default() {
        "text" => lines.push(cell(&block["text"])),
        "bullets" => lines.extend(cells(&block["items"]).into_iter().map(|item| format!("- {item}"))),
        "findings" => lines.extend(
            block["items"]
                .as_array()
                .map_or(&[][..], Vec::as_slice)
                .iter()
                .map(|item| format!("- {}", cell(&item["text"]))),
        ),
        "code" => lines.extend(cells(&block["lines"])),
        "table" => {
            lines.push(cells(&block["headers"]).join(" | "));
            let rows = block["rows"].as_array().map_or(&[][..], Vec::as_slice);
            let shown = rows.len().min(MAX_ROWS);
            lines.extend(rows.iter().take(shown).map(|row| cells(row).join(" | ")));
            let total = block["total"].as_u64().map_or(rows.len(), |t| t as usize);
            if total > shown {
                lines.push(format!("[{} more rows left out]", total - shown));
            }
        }
        "chart" => lines.push(format!("[A chart, {}: {}]", cell(&block["title"]), cell(&block["description"]))),
        _ => {}
    }
}

/// A kit report as plain words for a model: its title, facts, opening, and each section's text, bullets, tables and code. Charts
/// are named by their description; a globe is left out.
pub fn report_text(report: &Value) -> String {
    let mut lines = vec![report["title"].as_str().unwrap_or("A report").to_owned()];
    for fact in report["facts"].as_array().map_or(&[][..], Vec::as_slice) {
        lines.push(format!("{}: {}", cell(&fact["label"]), cell(&fact["value"])));
    }
    lines.extend(cells(&report["lines"]));
    for block in report["blocks"].as_array().map_or(&[][..], Vec::as_slice) {
        block_text(block, &mut lines);
    }
    for section in report["sections"].as_array().map_or(&[][..], Vec::as_slice) {
        lines.push(String::new());
        lines.push(format!("{}:", cell(&section["heading"])));
        for block in section["blocks"].as_array().map_or(&[][..], Vec::as_slice) {
            block_text(block, &mut lines);
        }
    }
    cut(lines.join("\n"))
}

/// Keeps a question for Send and returns it to be shown: the chosen service and model, the instruction and the text. When the
/// model may ask the tool kit's reports, the instruction says so, in the words the person reads first.
fn keep(data: &Path, what: &str, template: &str, text: String) -> Result<Prepared, Failure> {
    let ready = ai::ready(data)?;
    let mut said = instruction(template, ready.length);
    if ready.tools {
        said = format!("{said}\n\n{}", TOOLS.replace("{calls}", &MAX_CALLS.to_string()).trim());
    }
    let kind = ready.service.kind();
    let charged = match kind {
        Kind::Local => false,
        Kind::Key => true,
        Kind::Program => ai::login_of(&ready.service.id).is_some_and(|l| l.how == LoginHow::Key),
    };
    let prepared = Prepared {
        id: NEXT.fetch_add(1, Ordering::Relaxed),
        what: what.to_owned(),
        service: ready.service.name.clone(),
        model: ready.model.clone(),
        local: ready.service.local(),
        kind,
        charged,
        tools: ready.tools,
        instruction: said,
        characters: text.chars().count(),
        text,
    };
    let conversation = Conversation::new(prepared.clone());
    *PENDING.lock().map_err(|_| Failure::refused("the question could not be kept"))? = Some(conversation);
    Ok(prepared)
}

/// Builds the question about one fault the Logs page's last reading named, and keeps it for Send.
pub fn prepare_fault(data: &Path, game: &str, fault: &str) -> Result<Prepared, Failure> {
    let found = logs_page::remembered(game, fault)?;
    let name = games::find(game)?.map_or_else(|| game.to_owned(), |g| g.name);
    keep(data, EXPLAIN_FAULT_WHAT, EXPLAIN_FAULT, fault_text(&name, &found))
}

/// Builds the question about one version of a changelog the Changes page's last reading named (0.72.0).
pub fn prepare_version(
    data: &Path,
    game: &str,
    repository: &str,
    changelog: &str,
    version: &str,
) -> Result<Prepared, Failure> {
    let (product, found) = changes_page::remembered_version(game, repository, changelog, version)?;
    keep(data, SUMMARISE_VERSION_WHAT, SUMMARISE_VERSION, version_text(&product, changelog, &found))
}

/// Builds the question about a repository's last update check, from this run of the program (0.72.0).
pub fn prepare_update_check(data: &Path, game: &str, repository: &str) -> Result<Prepared, Failure> {
    let report = other_code_page::remembered_check(game, repository)?;
    keep(data, UPDATE_MEANING_WHAT, UPDATE_MEANING, report_text(&report))
}

/// A report the model asked for, as the person sees it: what it asked in a few words, the kit's answer, and whether it was sent.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CallView {
    pub tool: String,
    pub summary: String,
    pub text: String,
    pub characters: usize,
    /// The kit refused it or it failed: the model is told so in words.
    pub failed: bool,
    /// Sent to the model: always for a model on this computer; for an online one, only on the person's yes.
    pub sent: bool,
}

/// What the window hears while an answer comes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Event {
    /// A piece of the answer's text.
    Text { text: String },
    /// A report the model asked for, run and sent.
    Call { call: CallView },
}

/// Where a question stands after Send or a yes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "step", rename_all = "lowercase", rename_all_fields = "camelCase")]
pub enum Step {
    /// The model has answered.
    Answered { answer: Answer, calls: Vec<CallView>, tools_unavailable: bool },
    /// An online model asked for a report: it has run on this computer, and waits for the person's yes before it is sent.
    Waiting { call: CallView, calls: Vec<CallView> },
}

/// One question as it goes: the messages so far in the service's own shape, the tools offered, the reports asked for, and the
/// counts kept across every turn.
pub struct Conversation {
    prepared: Prepared,
    messages: Vec<Value>,
    tools: Vec<Tool>,
    started: bool,
    calls: Vec<CallView>,
    /// Reports run for an online model and not yet allowed, each with its id, its view and its kit answer.
    waiting: Vec<(String, CallView)>,
    /// The results of this turn's calls, to send back before the model is asked again.
    results: Vec<(String, String, bool)>,
    asked: usize,
    text: String,
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    tools_unavailable: bool,
}

impl Conversation {
    pub fn new(prepared: Prepared) -> Self {
        Self {
            messages: ai_client::first_messages(&prepared.text),
            prepared,
            tools: Vec::new(),
            started: false,
            calls: Vec::new(),
            waiting: Vec::new(),
            results: Vec::new(),
            asked: 0,
            text: String::new(),
            input_tokens: None,
            output_tokens: None,
            tools_unavailable: false,
        }
    }

    fn add(sum: &mut Option<u64>, more: Option<u64>) {
        if let Some(more) = more {
            *sum = Some(sum.unwrap_or(0) + more);
        }
    }
}

/// Asks the service one turn, handing each piece of text on as it comes.
pub type Ask<'a> = dyn Fn(&Request, &mut dyn FnMut(&str)) -> Answer + 'a;
/// Runs one report the model asked for: its text, and whether it was refused or failed.
pub type Run<'a> = dyn Fn(&ToolCall) -> (String, bool) + 'a;

/// The question's next steps until the model answers or an online model waits on a yes. `ask` asks the service and `run` runs one
/// report through the kit; both are passed in, so tests need neither a service nor a kit.
pub fn drive(
    conversation: &mut Conversation,
    ready: &ai::Ready,
    ask: &Ask,
    run: &Run,
    on_event: &mut dyn FnMut(Event),
) -> Step {
    let api = ready.service.api;
    loop {
        if let Some((_, call)) = conversation.waiting.first() {
            return Step::Waiting { call: call.clone(), calls: conversation.calls.clone() };
        }
        if !conversation.results.is_empty() {
            let results = std::mem::take(&mut conversation.results);
            conversation.messages.extend(ai_client::tool_results(api, &results));
        }
        let request = Request {
            service: ready.service,
            key: ready.key.as_deref(),
            model: &ready.model,
            system: &conversation.prepared.instruction,
            messages: &conversation.messages,
            tools: &conversation.tools,
            max_tokens: ready.length.max_tokens(),
        };
        let mut answer = ask(&request, &mut |text| on_event(Event::Text { text: text.to_owned() }));
        if answer.tools_refused && !conversation.tools.is_empty() && conversation.asked == 0 {
            // This model cannot take tools: ask again without them, once, and say so.
            conversation.tools.clear();
            conversation.tools_unavailable = true;
            continue;
        }
        Conversation::add(&mut conversation.input_tokens, answer.input_tokens);
        Conversation::add(&mut conversation.output_tokens, answer.output_tokens);
        if !answer.text.is_empty() {
            if !conversation.text.is_empty() {
                conversation.text.push_str("\n\n");
            }
            conversation.text.push_str(&answer.text);
        }
        if answer.stop != Stop::Calling || answer.calls.is_empty() {
            answer.text = conversation.text.clone();
            answer.input_tokens = conversation.input_tokens;
            answer.output_tokens = conversation.output_tokens;
            return Step::Answered {
                answer,
                calls: conversation.calls.clone(),
                tools_unavailable: conversation.tools_unavailable,
            };
        }
        conversation.messages.push(answer.assistant.clone());
        for call in &answer.calls {
            conversation.asked += 1;
            let (text, failed) = if conversation.asked > MAX_CALLS {
                (TOO_MANY.replace("{calls}", &MAX_CALLS.to_string()), true)
            } else {
                run(call)
            };
            let view = CallView {
                tool: call.name.clone(),
                summary: ai_tools::summary(call),
                characters: text.chars().count(),
                text,
                failed,
                sent: false,
            };
            if ready.service.local() {
                let view = CallView { sent: true, ..view };
                conversation.results.push((call.id.clone(), view.text.clone(), view.failed));
                conversation.calls.push(view.clone());
                on_event(Event::Call { call: view });
            } else {
                conversation.waiting.push((call.id.clone(), view));
            }
        }
    }
}

/// Takes the waiting conversation if it is the one named, with the service and model it was shown for.
fn take(data: &Path, id: u64) -> Result<(Conversation, ai::Ready), Failure> {
    let conversation = PENDING
        .lock()
        .ok()
        .and_then(|mut pending| pending.take_if(|c| c.prepared.id == id))
        .ok_or_else(|| Failure::refused("that question is no longer waiting: press the button again"))?;
    let ready = ai::ready(data)?;
    if ready.service.name != conversation.prepared.service || ready.model != conversation.prepared.model {
        return Err(Failure::refused("the AI service or model changed since this was shown: press the button again"));
    }
    Ok((conversation, ready))
}

/// Drives a conversation with the real service and kit, keeps it while it waits on a yes, and counts an answer's tokens.
fn go(
    data: &Path,
    mut conversation: Conversation,
    ready: &ai::Ready,
    on_event: &mut dyn FnMut(Event),
) -> Result<Step, Failure> {
    let step = drive(&mut conversation, ready, &ai_client::ask, &ai_tools::call, on_event);
    match &step {
        Step::Waiting { .. } => {
            *PENDING.lock().map_err(|_| Failure::refused("the question could not be kept"))? = Some(conversation);
        }
        Step::Answered { answer, .. } => {
            if answer.input_tokens.is_some() || answer.output_tokens.is_some() || !answer.text.is_empty() {
                let what = &conversation.prepared.what;
                ai::record_usage(
                    data,
                    &ready.service.id,
                    &ready.model,
                    what,
                    answer.input_tokens,
                    answer.output_tokens,
                )?;
            }
        }
    }
    Ok(step)
}

/// Sends the question last prepared, if it is the one named, streaming what happens to `on_event`.
pub fn send(data: &Path, id: u64, on_event: &mut dyn FnMut(Event)) -> Result<Step, Failure> {
    let (mut conversation, ready) = take(data, id)?;
    if !conversation.started {
        conversation.started = true;
        if conversation.prepared.tools {
            // The tools come from the kit; if it cannot say, the question goes without them.
            conversation.tools = ai_tools::definitions().unwrap_or_default();
            conversation.tools_unavailable = conversation.tools.is_empty();
        }
    }
    go(data, conversation, &ready, on_event)
}

/// The person's answer to a report an online model asked for: sent on a yes; on a no, the model is told it was declined.
pub fn answer_call(data: &Path, id: u64, allow: bool, on_event: &mut dyn FnMut(Event)) -> Result<Step, Failure> {
    let (mut conversation, ready) = take(data, id)?;
    if conversation.waiting.is_empty() {
        return Err(Failure::refused("no report is waiting for your answer"));
    }
    let (call_id, view) = conversation.waiting.remove(0);
    let view = CallView { sent: allow, ..view };
    let text = if allow { view.text.clone() } else { DECLINED.to_owned() };
    conversation.results.push((call_id, text, view.failed || !allow));
    conversation.calls.push(view.clone());
    on_event(Event::Call { call: view });
    go(data, conversation, &ready, on_event)
}

#[cfg(test)]
#[path = "tests/ai_help.rs"]
mod tests;
