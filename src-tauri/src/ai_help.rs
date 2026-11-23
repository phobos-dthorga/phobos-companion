//! Help on pages from an AI service (0.71.0; `docs/ai.md`, A2; the owner's choice of 23 Nov 2026: "shown first, then my press").
//!
//! A question is asked in two steps. **Prepare** builds exactly what would be sent, from what the host itself read (a fault the Logs
//! page's last reading named, by its id) and an instruction file kept with the program (`prompts/`), and shows it whole, with the
//! service and model it would go to. **Send** sends that and nothing else, only for the question last prepared, and checks the
//! service's gate again (`companion_core::ai::ready`). The model is given no tools, and its answer is text to show.

use crate::logs_page;
use companion_core::ai::{self, Length};
use companion_core::ai_client::{self, Answer, Request};
use companion_core::failure::Failure;
use companion_core::games;
use serde::Serialize;
use serde_json::Value;
use std::path::Path;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};

const EXPLAIN_FAULT: &str = include_str!("../../prompts/explain-fault.md");
const EXPLAIN_FAULT_WHAT: &str = "explain-fault";
const MAX_TEXT: usize = 12_000;
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
    pub instruction: String,
    pub text: String,
    pub characters: usize,
}

static NEXT: AtomicU64 = AtomicU64::new(1);
static PENDING: Mutex<Option<Prepared>> = Mutex::new(None);

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

/// Builds the question about one fault the Logs page's last reading named, and keeps it for Send.
pub fn prepare_fault(data: &Path, game: &str, fault: &str) -> Result<Prepared, Failure> {
    let ready = ai::ready(data)?;
    let found = logs_page::remembered(game, fault)?;
    let name = games::find(game)?.map_or_else(|| game.to_owned(), |g| g.name);
    let text = fault_text(&name, &found);
    let prepared = Prepared {
        id: NEXT.fetch_add(1, Ordering::Relaxed),
        what: EXPLAIN_FAULT_WHAT.to_owned(),
        service: ready.service.name.clone(),
        model: ready.model.clone(),
        local: ready.service.local(),
        instruction: instruction(EXPLAIN_FAULT, ready.length),
        characters: text.chars().count(),
        text,
    };
    *PENDING.lock().map_err(|_| Failure::refused("the question could not be kept"))? = Some(prepared.clone());
    Ok(prepared)
}

/// Sends the question last prepared, if it is the one named, streaming the answer's text to `on_text`; counts its tokens.
pub fn send(data: &Path, id: u64, on_text: &mut dyn FnMut(&str)) -> Result<Answer, Failure> {
    let prepared = PENDING
        .lock()
        .ok()
        .and_then(|mut pending| pending.take_if(|p| p.id == id))
        .ok_or_else(|| Failure::refused("that question is no longer waiting: press Explain this fault again"))?;
    let ready = ai::ready(data)?;
    if ready.service.name != prepared.service || ready.model != prepared.model {
        return Err(Failure::refused(
            "the AI service or model changed since this was shown: press Explain this fault again",
        ));
    }
    let request = Request {
        service: ready.service,
        key: ready.key.as_deref(),
        model: &ready.model,
        system: &prepared.instruction,
        user: &prepared.text,
        max_tokens: ready.length.max_tokens(),
    };
    let answer = ai_client::ask(&request, on_text);
    if answer.input_tokens.is_some() || answer.output_tokens.is_some() || !answer.text.is_empty() {
        ai::record_usage(
            data,
            &ready.service.id,
            &ready.model,
            &prepared.what,
            answer.input_tokens,
            answer.output_tokens,
        )?;
    }
    Ok(answer)
}

#[cfg(test)]
#[path = "tests/ai_help.rs"]
mod tests;
