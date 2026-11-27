//! Help on pages through a program the person installed and logged in to (0.115.0; `docs/ai.md`, A4, slice 7; the owner's choices
//! by card, 28 Nov 2026: "own program, tools off", "Claude, Codex, Gemini" and "reports with a press each"). Game-free.
//!
//! The program (Claude Code, Codex or Gemini CLI, as `config/ai-services.json` names them) is started for **one answer**: found by
//! name on the search path, in **an empty folder of its own** that is removed afterwards, **with its tools switched off** by its
//! own arguments, the variables that would make it charge per use taken out of its environment, and the question on standard
//! input. Its answer is read from its output as it comes, by one of three [`Reader`]s. **The Companion never holds, reads or
//! passes the program's login**: the program uses its own. Its own login check is read for three facts only ([`read_login`]).
//!
//! **The tool kit's reports, a press each.** A program is not handed the kit's tools. When the person lets the AI ask the kit's
//! reports, the question says how to ask for one in plain text ([`MARK`]); an answer that is only that line becomes a call, which
//! `ai_help` runs and holds for the person's yes, exactly as for a service charged per use. Each later turn starts the program
//! again with the whole conversation as text ([`prompt`]), since each run forgets.

use crate::ai::{
    INSTRUCTION_FILE, Login, LoginHow, LoginReads, MODEL, MODEL_ARGS, OWN_CHOICE, Program, Reads, Service,
};
use crate::ai_client::{Answer, Request, Stop, Tool, ToolCall};
use crate::process;
use serde_json::{Value, json};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// How a program asks for one of the tool kit's reports: an answer that is this word, a space and one JSON object, and nothing
/// else.
pub const MARK: &str = "ASK-REPORT";
/// The longest a program may take over one answer, as for an online service; then it and everything it started are ended.
const WHOLE_ANSWER: Duration = Duration::from_secs(600);
const LOGIN_CHECK: Duration = Duration::from_secs(30);
const MAX_ANSWER: usize = 200_000;
const MAX_ERRORS: usize = 64 * 1024;
const MAX_LOGIN_OUTPUT: usize = 64 * 1024;
const MAX_SAID: usize = 600;
const INSTRUCTION_NAME: &str = "instruction.md";
const FOLDERS: &str = "dthorga-companion-ai";
static NEXT: AtomicUsize = AtomicUsize::new(0);

/// The program's arguments for one answer: the row's own, with the instruction file's path and the model filled in. The
/// program's own choice of model leaves the model's arguments out.
pub fn arguments(program: &Program, model: &str, instruction_file: &Path) -> Vec<String> {
    let mut found = Vec::new();
    for argument in &program.args {
        match argument.as_str() {
            INSTRUCTION_FILE => found.push(instruction_file.to_string_lossy().into_owned()),
            MODEL_ARGS => {
                if model != OWN_CHOICE {
                    found.extend(
                        program.model_args.iter().map(|a| if a == MODEL { model.to_owned() } else { a.clone() }),
                    );
                }
            }
            _ => found.push(argument.clone()),
        }
    }
    found
}

/// How to ask for a report, and the tools as the kit describes them.
pub fn tools_text(tools: &[Tool]) -> String {
    let mut lines = vec![format!(
        "To ask the tool kit for a report, reply with exactly one line and nothing else, with no code fence:\n{MARK} \
         {{\"tool\": \"<a tool's name>\", \"arguments\": {{<its arguments as JSON>}}}}\nThe person sees the report's answer and \
         chooses whether it is sent to you; you are then given it, or told it was declined. Ask for one report at a time.\n\nThe \
         tools:"
    )];
    for tool in tools {
        lines.push(format!(
            "- {}: {}\n  Its arguments, as a JSON schema: {}",
            tool.name,
            tool.description.trim(),
            tool.schema
        ));
    }
    lines.join("\n")
}

fn content(message: &Value) -> String {
    message["content"].as_str().unwrap_or_default().trim().to_owned()
}

/// Everything the program reads on standard input for this turn: the instruction where it does not take a file, how to ask for
/// a report when it may, and the question, or the whole conversation so far once it has asked for one.
pub fn prompt(request: &Request, with_instruction: bool) -> String {
    let mut parts = Vec::new();
    if with_instruction {
        parts.push(request.system.trim().to_owned());
    }
    if !request.tools.is_empty() {
        parts.push(tools_text(request.tools));
    }
    if let [only] = request.messages {
        parts.push(content(only));
    } else {
        let mut said = vec!["The conversation so far, oldest first:".to_owned()];
        for (index, message) in request.messages.iter().enumerate() {
            let who = if message["role"] == "assistant" {
                "[You asked]"
            } else if message["report"] == true && message["failed"] == true {
                "[The report was not given]"
            } else if message["report"] == true {
                "[The tool kit's report]"
            } else if index == 0 {
                "[The question]"
            } else {
                "[The person]"
            };
            said.push(format!("{who}\n{}", content(message)));
        }
        said.push("Now answer the question, or ask for one more report.".to_owned());
        parts.push(said.join("\n\n"));
    }
    parts.join("\n\n")
}

/// The report an answer asks for: only when the whole answer is [`MARK`], a space and one JSON object naming a tool (a code
/// fence around it is forgiven). Anything else is an answer to show.
pub fn call_of(text: &str, id: &str) -> Option<ToolCall> {
    let mut line = text.trim();
    if let Some(fenced) = line.strip_prefix("```") {
        line = fenced.strip_suffix("```")?.trim_start_matches(|c: char| c.is_ascii_alphanumeric()).trim();
    }
    let rest = line.strip_prefix(MARK)?;
    if !rest.starts_with([' ', '\t']) || rest.contains('\n') {
        return None;
    }
    let asked: Value = serde_json::from_str(rest.trim()).ok()?;
    let name = asked["tool"].as_str()?.to_owned();
    let input = asked.get("arguments").cloned().unwrap_or_else(|| json!({}));
    Some(ToolCall { id: id.to_owned(), name, input })
}

fn add(sum: &mut Option<u64>, more: Option<u64>) {
    if let Some(more) = more {
        *sum = Some(sum.unwrap_or(0) + more);
    }
}

fn said(text: &str) -> Option<String> {
    let text = text.trim();
    if text.is_empty() {
        return None;
    }
    let count = text.chars().count();
    Some(if count > MAX_SAID { text.chars().skip(count - MAX_SAID).collect() } else { text.to_owned() })
}

/// Gemini CLI's token counts, where its statistics give them: as two plain fields, or each model's own.
fn gemini_tokens(stats: &Value) -> (Option<u64>, Option<u64>) {
    if stats["input_tokens"].is_u64() || stats["output_tokens"].is_u64() {
        return (stats["input_tokens"].as_u64(), stats["output_tokens"].as_u64());
    }
    let (mut input, mut output) = (None, None);
    for model in stats["models"].as_object().into_iter().flat_map(|m| m.values()) {
        let tokens = &model["tokens"];
        add(&mut input, tokens["prompt"].as_u64().or_else(|| tokens["input"].as_u64()));
        add(&mut output, tokens["candidates"].as_u64().or_else(|| tokens["output"].as_u64()));
    }
    (input, output)
}

/// Reads one program's output, a line at a time, into an answer. While the AI may ask for a report, text that could still be
/// [`MARK`] is held back, so a request is never shown as an answer.
pub struct Reader {
    reads: Reads,
    tools: bool,
    answer: Answer,
    holding: bool,
    deltas: bool,
    finished: bool,
    failed: bool,
    problem: Option<String>,
}

impl Reader {
    pub fn new(reads: Reads, tools: bool) -> Self {
        Self {
            reads,
            tools,
            answer: Answer::new(),
            holding: tools,
            deltas: false,
            finished: false,
            failed: false,
            problem: None,
        }
    }

    fn emit(&mut self, piece: &str, on_text: &mut dyn FnMut(&str)) {
        if piece.is_empty() || self.answer.text.len() >= MAX_ANSWER {
            return;
        }
        self.answer.text.push_str(piece);
        if !self.holding {
            on_text(piece);
            return;
        }
        let start = self.answer.text.trim_start();
        let may_ask = if start.len() < MARK.len() { MARK.starts_with(start) } else { start.starts_with(MARK) };
        if !may_ask {
            self.holding = false;
            on_text(&self.answer.text);
        }
    }

    /// One line of the program's output.
    pub fn line(&mut self, line: &str, on_text: &mut dyn FnMut(&str)) {
        let Ok(event) = serde_json::from_str::<Value>(line.trim()) else { return };
        match self.reads {
            Reads::ClaudeStream => self.claude(&event, on_text),
            Reads::CodexJson => self.codex(&event, on_text),
            Reads::GeminiStream => self.gemini(&event, on_text),
        }
    }

    /// Claude Code's `stream-json`: text pieces as `stream_event`s, the whole message as `assistant`, and a closing `result`.
    fn claude(&mut self, event: &Value, on_text: &mut dyn FnMut(&str)) {
        match event["type"].as_str().unwrap_or_default() {
            "stream_event" => {
                let inner = &event["event"];
                if inner["type"] == "content_block_delta" && inner["delta"]["type"] == "text_delta" {
                    self.deltas = true;
                    self.emit(inner["delta"]["text"].as_str().unwrap_or_default(), on_text);
                }
            }
            "assistant" if !self.deltas => {
                for block in event["message"]["content"].as_array().map_or(&[][..], Vec::as_slice) {
                    if block["type"] == "text" {
                        self.emit(block["text"].as_str().unwrap_or_default(), on_text);
                    }
                }
            }
            "result" => {
                self.finished = true;
                let usage = &event["usage"];
                for field in ["input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"] {
                    add(&mut self.answer.input_tokens, usage[field].as_u64());
                }
                self.answer.output_tokens = usage["output_tokens"].as_u64();
                let subtype = event["subtype"].as_str().unwrap_or("success");
                if event["is_error"] == true || subtype != "success" {
                    self.failed = true;
                    let errors: Vec<&str> = event["errors"]
                        .as_array()
                        .map_or(&[][..], Vec::as_slice)
                        .iter()
                        .filter_map(Value::as_str)
                        .collect();
                    self.problem = event["result"]
                        .as_str()
                        .and_then(said)
                        .or_else(|| said(&errors.join("; ")))
                        .or_else(|| Some(subtype.replace('_', " ")));
                    return;
                }
                self.answer.stop = match event["stop_reason"].as_str() {
                    Some("refusal") => Stop::Refused,
                    Some("max_tokens") => Stop::Cut,
                    _ => Stop::Finished,
                };
                if self.answer.text.is_empty() {
                    self.emit(event["result"].as_str().unwrap_or_default(), on_text);
                }
            }
            _ => {}
        }
    }

    /// Codex's `exec --json`: each message whole as an `agent_message` item, the counts on `turn.completed`.
    fn codex(&mut self, event: &Value, on_text: &mut dyn FnMut(&str)) {
        match event["type"].as_str().unwrap_or_default() {
            "item.completed" if event["item"]["type"] == "agent_message" => {
                if !self.answer.text.is_empty() {
                    self.emit("\n\n", on_text);
                }
                self.emit(event["item"]["text"].as_str().unwrap_or_default(), on_text);
            }
            "turn.completed" => {
                self.finished = true;
                let usage = &event["usage"];
                self.answer.input_tokens = usage["input_tokens"].as_u64();
                for field in ["output_tokens", "reasoning_output_tokens"] {
                    add(&mut self.answer.output_tokens, usage[field].as_u64());
                }
            }
            "turn.failed" => {
                self.finished = true;
                self.failed = true;
                self.problem = event["error"]["message"].as_str().and_then(said).or(self.problem.take());
            }
            "error" => self.problem = event["message"].as_str().and_then(said),
            _ => {}
        }
    }

    /// Gemini CLI's `stream-json`: the assistant's `message`s, whole or as pieces, and a closing `result` with its statistics.
    fn gemini(&mut self, event: &Value, on_text: &mut dyn FnMut(&str)) {
        match event["type"].as_str().unwrap_or_default() {
            "message" if event["role"] == "assistant" => {
                let piece = event["content"].as_str().or_else(|| event["text"].as_str()).unwrap_or_default();
                if event["delta"] == true {
                    self.deltas = true;
                    self.emit(piece, on_text);
                } else if !self.deltas {
                    self.emit(piece, on_text);
                }
            }
            "result" => {
                self.finished = true;
                (self.answer.input_tokens, self.answer.output_tokens) = gemini_tokens(&event["stats"]);
                if event["status"] == "error" || event["error"].is_object() {
                    self.failed = true;
                    self.problem = event["error"]["message"].as_str().and_then(said).or(self.problem.take());
                }
            }
            "error" => self.problem = event["message"].as_str().and_then(said),
            _ => {}
        }
    }

    /// The answer once the program has ended: a report it asked for, its words, or what went wrong in its own words where it
    /// gave them, else the end of what it wrote to its errors.
    pub fn finish(self, name: &str, call_id: &str, ran: &Ran) -> Answer {
        if ran.timed_out {
            return Answer::failed(format!(
                "{name} took longer than {} minutes and was stopped",
                WHOLE_ANSWER.as_secs() / 60
            ));
        }
        if self.failed || !self.finished {
            let why = self.problem.or_else(|| said(&ran.errors)).unwrap_or_else(|| match ran.exit {
                Some(code) => format!("it ended with exit code {code} and did not say why"),
                None => "it ended and did not say why".to_owned(),
            });
            let mut answer = Answer::failed(if self.finished {
                format!("{name} said: {why}")
            } else {
                format!("{name} stopped before it finished: {why}")
            });
            answer.input_tokens = self.answer.input_tokens;
            answer.output_tokens = self.answer.output_tokens;
            return answer;
        }
        let mut answer = self.answer;
        if self.tools
            && let Some(call) = call_of(&answer.text, call_id)
        {
            answer.stop = Stop::Calling;
            answer.assistant = json!({"role": "assistant", "content": answer.text.trim()});
            answer.calls = vec![call];
            answer.text = String::new();
        }
        answer
    }
}

/// How a program's run ended: its exit code, the end of what it wrote to its errors, and whether it was stopped for taking too
/// long.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Ran {
    pub exit: Option<i32>,
    pub errors: String,
    pub timed_out: bool,
}

/// An empty folder of the program's own for one run, in the system's temporary folder.
fn work_folder() -> Result<PathBuf, String> {
    let folder = std::env::temp_dir().join(FOLDERS).join(format!(
        "{}-{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::Relaxed)
    ));
    let _ = std::fs::remove_dir_all(&folder);
    std::fs::create_dir_all(&folder).map_err(|e| format!("a folder for the program could not be made: {e}"))?;
    Ok(folder)
}

/// Starts a program in `folder`, with no console, as the leader of its own group, and without the variables named.
pub fn start(path: &Path, args: &[String], folder: &Path, drop: &[String]) -> std::io::Result<Child> {
    let mut command = Command::new(path);
    command.args(args).current_dir(folder).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    for variable in drop {
        command.env_remove(variable);
    }
    process::hide_console(&mut command);
    process::own_group(&mut command);
    command.spawn()
}

/// Follows a started program to its end: `input` written to its standard input and closed, each line of its output handed to
/// `line`, the end of its errors kept, and it and everything it started ended after `limit`.
pub fn follow(mut child: Child, input: Option<String>, limit: Duration, line: &mut dyn FnMut(&str)) -> Ran {
    if let Some(mut stdin) = child.stdin.take() {
        let text = input.unwrap_or_default();
        std::thread::spawn(move || {
            let _ = stdin.write_all(text.as_bytes());
        });
    }
    let errors = child.stderr.take().map(|mut stderr| {
        std::thread::spawn(move || {
            let mut kept: Vec<u8> = Vec::new();
            let mut chunk = [0u8; 8192];
            while let Ok(count) = stderr.read(&mut chunk) {
                if count == 0 {
                    break;
                }
                kept.extend_from_slice(&chunk[..count]);
                if kept.len() > MAX_ERRORS {
                    kept.drain(..kept.len() - MAX_ERRORS);
                }
            }
            String::from_utf8_lossy(&kept).into_owned()
        })
    });
    let stdout = child.stdout.take();
    let child = Arc::new(Mutex::new(child));
    let timed_out = Arc::new(AtomicBool::new(false));
    let (done, waiting) = mpsc::channel::<()>();
    {
        let child = Arc::clone(&child);
        let timed_out = Arc::clone(&timed_out);
        std::thread::spawn(move || {
            if matches!(waiting.recv_timeout(limit), Err(RecvTimeoutError::Timeout)) {
                timed_out.store(true, Ordering::SeqCst);
                if let Ok(mut child) = child.lock() {
                    process::end_tree(&mut child);
                }
            }
        });
    }
    if let Some(stdout) = stdout {
        let mut reader = BufReader::new(stdout);
        let mut bytes = Vec::new();
        loop {
            bytes.clear();
            match reader.read_until(b'\n', &mut bytes) {
                Ok(0) | Err(_) => break,
                Ok(_) => line(&String::from_utf8_lossy(&bytes)),
            }
        }
    }
    // Its output has ended: wait for it without holding the lock for long, so the watch can still end it.
    let exit = loop {
        let status = child.lock().ok().and_then(|mut c| c.try_wait().ok().flatten());
        if let Some(status) = status {
            break status.code();
        }
        std::thread::sleep(Duration::from_millis(50));
    };
    let _ = done.send(());
    let errors = errors.and_then(|e| e.join().ok()).unwrap_or_default();
    Ran { exit, errors, timed_out: timed_out.load(Ordering::SeqCst) }
}

/// Asks the program one turn of a question, handing each piece of its answer on as it comes.
pub fn ask(request: &Request, on_text: &mut dyn FnMut(&str)) -> Answer {
    let service = request.service;
    let Some(program) = &service.program else {
        return Answer::failed(format!("{} is not a program on this computer", service.name));
    };
    if !program.models.iter().any(|m| m == request.model) {
        return Answer::failed(format!(
            "{} offers no model {:?}: choose one again in Settings → AI",
            service.name, request.model
        ));
    }
    let Some(path) = crate::acp::find_on_path(&program.command) else {
        return Answer::failed(format!("{} is not on this computer. {}", service.name, program.get));
    };
    let folder = match work_folder() {
        Ok(folder) => folder,
        Err(problem) => return Answer::failed(problem),
    };
    let instruction_file = folder.join(INSTRUCTION_NAME);
    let in_file = program.args.iter().any(|a| a == INSTRUCTION_FILE);
    if in_file && let Err(problem) = std::fs::write(&instruction_file, request.system) {
        let _ = std::fs::remove_dir_all(&folder);
        return Answer::failed(format!("the instruction could not be written for {}: {problem}", service.name));
    }
    let arguments = arguments(program, request.model, &instruction_file);
    let input = prompt(request, !in_file);
    let mut reader = Reader::new(program.reads, !request.tools.is_empty());
    let answer = match start(&path, &arguments, &folder, &program.drop_variables) {
        Ok(child) => {
            let ran = follow(child, Some(input), WHOLE_ANSWER, &mut |line| reader.line(line, &mut *on_text));
            reader.finish(&service.name, &format!("report-{}", request.messages.len()), &ran)
        }
        Err(problem) => Answer::failed(format!("{} could not be started: {problem}", service.name)),
    };
    let _ = std::fs::remove_dir_all(&folder);
    answer
}

fn plan_name(plan: &str) -> bool {
    !plan.is_empty() && plan.len() <= 30 && plan.bytes().all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-'))
}

/// What a program's own login check said, from its output and exit code. **Only three facts are read**: whether it is logged in,
/// whether with a plan or a key, and the plan's name; anything else it prints (an email address, an organisation) is never kept.
pub fn read_login(reads: LoginReads, exit: Option<i32>, output: &str) -> Login {
    match reads {
        LoginReads::ClaudeAuth => {
            let said: Value = serde_json::from_str(output.trim()).unwrap_or(Value::Null);
            let logged_in = said["loggedIn"].as_bool().unwrap_or(false) && exit == Some(0);
            let how = match said["authMethod"].as_str() {
                _ if !logged_in => LoginHow::Unknown,
                Some("claude.ai" | "oauth_token") => LoginHow::Plan,
                Some("api_key" | "api_key_helper") => LoginHow::Key,
                _ => LoginHow::Unknown,
            };
            let plan =
                said["subscriptionType"].as_str().filter(|p| how == LoginHow::Plan && plan_name(p)).map(str::to_owned);
            Login { logged_in, how, plan }
        }
        LoginReads::CodexStatus => {
            let words = output.to_ascii_lowercase();
            let logged_in = exit == Some(0);
            let how = if !logged_in {
                LoginHow::Unknown
            } else if words.contains("chatgpt") {
                LoginHow::Plan
            } else if words.contains("api key") {
                LoginHow::Key
            } else {
                LoginHow::Unknown
            };
            Login { logged_in, how, plan: None }
        }
    }
}

/// Runs a program's own login check, without the variables its row takes out, in an empty folder, for at most 30 seconds.
pub fn login(service: &Service) -> Result<Login, String> {
    let program = service.program.as_ref().ok_or_else(|| format!("{} is not a program", service.name))?;
    let check = program.login.as_ref().ok_or_else(|| format!("{} has no login check", service.name))?;
    let path = crate::acp::find_on_path(&program.command)
        .ok_or_else(|| format!("{} is not on this computer. {}", service.name, program.get))?;
    let folder = work_folder()?;
    let started = start(&path, &check.args, &folder, &program.drop_variables);
    let mut output = String::new();
    let ran = started.map(|child| {
        follow(child, None, LOGIN_CHECK, &mut |line| {
            if output.len() < MAX_LOGIN_OUTPUT {
                output.push_str(line);
            }
        })
    });
    let _ = std::fs::remove_dir_all(&folder);
    let ran = ran.map_err(|problem| format!("{}'s login check could not be started: {problem}", service.name))?;
    if ran.timed_out {
        return Err(format!("{}'s login check took longer than {} seconds", service.name, LOGIN_CHECK.as_secs()));
    }
    Ok(read_login(check.reads, ran.exit, &output))
}

#[cfg(test)]
#[path = "tests/ai_programs.rs"]
mod tests;
