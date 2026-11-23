//! The Agent Client Protocol, the client's side (0.74.0; `docs/ai.md`, A3; the owner, 23 Nov 2026: "go ahead with A3"). Game-free.
//!
//! An agent (Claude, Codex, Gemini CLI and others) is its own program, started by the program with its input and output kept: one
//! JSON-RPC 2.0 message a line each way, as the protocol's stdio transport says. The agents are data (`config/chat-agents.json`):
//! each a command found by name on the system's search path, never installed by us. This module speaks the protocol and nothing
//! more; the Chat page's host module starts and ends the program.
//!
//! **What an agent may do through the Companion**: read a text file inside the repository it was started in (`fs/read_text_file`,
//! each read shown to the person), ask the person's permission for its own steps (`session/request_permission`, answered only
//! by the person), and since 0.75.0 (slice 5) **write a text file inside the repository, only after the person saw exactly what
//! would change and said yes** (`fs/write_text_file`, never inside `.git`). **Never** run a command through the Companion: it is
//! not offered, and each such request is refused and shown. The agent's own tools are its own: it may change files by itself, as it would in a terminal, and the page
//! says so before a first start.

use crate::failure::Failure;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::HashMap;
use std::ffi::OsStr;
use std::io::{BufRead, Read, Write};
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

/// The protocol's major version this client speaks.
pub const PROTOCOL_VERSION: u64 = 1;
const AGENTS: &str = include_str!("../../../config/chat-agents.json");
/// The largest file an agent may read through the Companion.
const MAX_READ: u64 = 2 * 1024 * 1024;
/// The error an agent gives when its person must log in first (`auth_required`).
const AUTH_REQUIRED: i64 = -32000;
const METHOD_NOT_FOUND: i64 = -32601;
const INVALID_PARAMS: i64 = -32602;
/// What the agent is told when the person declines a change.
const DECLINED: &str = "The person chose not to make this change. Go on without it, or ask them.";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    /// The program's name, found on the system's search path.
    pub command: String,
    pub args: Vec<String>,
    /// Where the person gets it, in words.
    pub get: String,
}

fn plain(text: &str, extra: &[u8]) -> bool {
    !text.is_empty() && text.len() <= 60 && text.bytes().all(|b| b.is_ascii_alphanumeric() || extra.contains(&b))
}

/// The agents a file lists, each checked: a plain id once, a name, and a command that is a bare program name (no folder, no
/// spaces), with arguments of one line each.
pub fn checked_agents(text: &str) -> Result<Vec<Agent>, String> {
    let file: Value = serde_json::from_str(text).map_err(|e| format!("the agents file could not be read: {e}"))?;
    let agents: Vec<Agent> =
        serde_json::from_value(file["agents"].clone()).map_err(|e| format!("an agent could not be read: {e}"))?;
    let mut seen = Vec::new();
    for agent in &agents {
        let args_ok = agent.args.iter().all(|a| !a.is_empty() && a.len() <= 100 && !a.chars().any(char::is_control));
        if !plain(&agent.id, b"-")
            || seen.contains(&agent.id)
            || agent.name.trim().is_empty()
            || !plain(&agent.command, b"-_.")
            || !args_ok
        {
            return Err(format!("the agent {:?} is not one the program can start", agent.id));
        }
        seen.push(agent.id.clone());
    }
    Ok(agents)
}

/// The agents this program knows.
pub fn agents() -> &'static [Agent] {
    static FOUND: OnceLock<Vec<Agent>> = OnceLock::new();
    FOUND.get_or_init(|| checked_agents(AGENTS).unwrap_or_default())
}

pub fn agent(id: &str) -> Result<&'static Agent, Failure> {
    agents()
        .iter()
        .find(|a| a.id == id)
        .ok_or_else(|| Failure::refused(format!("\"{id}\" is not an agent this program knows")))
}

/// A program found by name on a search path, as a shell finds it: on Windows with each of `extensions` (PATHEXT) added, since an
/// npm program is a `.cmd` file there; elsewhere the name itself.
pub fn find_program(name: &str, path: Option<&OsStr>, extensions: Option<&str>) -> Option<PathBuf> {
    let path = path?;
    for folder in std::env::split_paths(path) {
        match extensions {
            Some(extensions) => {
                for ending in extensions.split(';').filter(|e| !e.is_empty()) {
                    let found = folder.join(format!("{name}{}", ending.to_ascii_lowercase()));
                    if found.is_file() {
                        return Some(found);
                    }
                }
            }
            None => {
                let found = folder.join(name);
                if found.is_file() {
                    return Some(found);
                }
            }
        }
    }
    None
}

/// A program on this system's own search path.
pub fn find_on_path(name: &str) -> Option<PathBuf> {
    let path = std::env::var_os("PATH");
    if cfg!(windows) {
        let extensions = std::env::var("PATHEXT").unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".to_owned());
        find_program(name, path.as_deref(), Some(&extensions))
    } else {
        find_program(name, path.as_deref(), None)
    }
}

/// One step of an agent's plan.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct PlanEntry {
    pub content: String,
    pub status: String,
}

/// One answer the agent offers when it asks the person's permission.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct PermissionOption {
    pub id: String,
    pub name: String,
    pub kind: String,
}

/// What the page hears from the agent.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Event {
    /// A piece of the agent's answer (`agent`), or of its thinking (`thought`).
    Text { role: String, text: String },
    /// One of the agent's own steps, as it reports it, or a change to one.
    Tool { id: String, title: Option<String>, tool: Option<String>, status: Option<String> },
    /// The agent's plan, whole each time.
    Plan { entries: Vec<PlanEntry> },
    /// The agent asks the person's permission; only the person answers.
    Permission { request: String, title: String, options: Vec<PermissionOption> },
    /// The agent read a file through the Companion, or was refused.
    Read { path: String, allowed: bool, reason: Option<String> },
    /// The agent asks to write a file through the Companion (0.75.0): what is there now, if anything, and what it would write. It
    /// waits for the person's yes.
    Write { request: String, path: String, before: Option<String>, after: String },
    /// A write the agent asked for, made on the person's yes, or not made (declined, or refused by a check), with why.
    Written { path: String, written: bool, reason: Option<String> },
    /// The agent asked to run a command, or for something else the Companion does not offer, and was refused.
    Refused { what: String },
    /// The agent's program has ended.
    Ended { reason: String },
}

pub type OnEvent = Arc<dyn Fn(Event) + Send + Sync>;

/// A file the agent asked to read, checked: an absolute path to a file inside the root, of a sane size. Returns the path as the
/// person sees it (inside the repository) and the text, from `line` (1-based) for `limit` lines when given.
pub fn read_file(root: &Path, params: &Value) -> Result<(String, String), (String, String)> {
    let asked = params["path"].as_str().unwrap_or_default();
    let shown = asked.to_owned();
    let path = Path::new(asked);
    if !path.is_absolute() || path.components().any(|c| c == Component::ParentDir) {
        return Err((shown, "the path is not an absolute path to a file".to_owned()));
    }
    let real = path.canonicalize().map_err(|_| (shown.clone(), "there is no such file".to_owned()))?;
    let Ok(inside) = real.strip_prefix(root) else {
        return Err((shown, "it is outside the repository the agent was started in".to_owned()));
    };
    let shown = inside.to_string_lossy().replace('\\', "/");
    let size = real.metadata().map(|m| m.len()).map_err(|_| (shown.clone(), "it could not be read".to_owned()))?;
    if !real.is_file() || size > MAX_READ {
        return Err((shown, format!("it is not a file of at most {} MB", MAX_READ / (1024 * 1024))));
    }
    let mut bytes = Vec::new();
    std::fs::File::open(&real)
        .and_then(|mut f| f.read_to_end(&mut bytes))
        .map_err(|_| (shown.clone(), "it could not be read".to_owned()))?;
    let text = String::from_utf8_lossy(&bytes).into_owned();
    let first = params["line"].as_u64().unwrap_or(1).max(1) as usize;
    let content = match params["limit"].as_u64() {
        Some(limit) => text.lines().skip(first - 1).take(limit as usize).collect::<Vec<_>>().join("\n"),
        None if first > 1 => text.lines().skip(first - 1).collect::<Vec<_>>().join("\n"),
        None => text,
    };
    Ok((shown, content))
}

/// Where a file the agent asked to write would go, checked: an absolute path, never inside `.git`, whose nearest existing folder,
/// once links are followed, is inside the root, and which is not a folder. Returns the path as the person sees it (inside the
/// repository) and the path to write.
pub fn write_target(root: &Path, asked: &str) -> Result<(String, PathBuf), (String, String)> {
    let shown = asked.to_owned();
    let path = Path::new(asked);
    let refused = |why: &str| Err((shown.clone(), why.to_owned()));
    if asked.is_empty() || !path.is_absolute() || path.components().any(|c| c == Component::ParentDir) {
        return refused("the path is not an absolute path to a file");
    }
    let Some(name) = path.file_name() else { return refused("the path names no file") };
    let mut folder = path.parent().unwrap_or(path).to_path_buf();
    let mut missing = Vec::new();
    while !folder.exists() {
        let Some(part) = folder.file_name() else { return refused("no folder of it exists") };
        missing.push(part.to_owned());
        folder = folder.parent().map(Path::to_path_buf).unwrap_or_default();
    }
    let Ok(real) = folder.canonicalize() else { return refused("its folder could not be read") };
    let Ok(inside) = real.strip_prefix(root) else {
        return refused("it is outside the repository the agent was started in");
    };
    let mut relative = inside.to_path_buf();
    relative.extend(missing.iter().rev());
    relative.push(name);
    let shown = relative.to_string_lossy().replace('\\', "/");
    if relative.components().any(|c| c.as_os_str().eq_ignore_ascii_case(".git")) {
        return Err((shown, "git's own folder is never changed".to_owned()));
    }
    let target = root.join(&relative);
    if target.is_dir() {
        return Err((shown, "it is a folder".to_owned()));
    }
    if let Ok(followed) = target.canonicalize()
        && !followed.starts_with(root)
    {
        return Err((shown, "it leads outside the repository".to_owned()));
    }
    Ok((shown, target))
}

/// A write waiting on the person: the agent's request id, where it goes, and what it would write.
struct Waiting {
    id: Value,
    shown: String,
    target: PathBuf,
    content: String,
}

/// One running agent, as the protocol sees it: what is written to it, the requests waiting for its answers, the permissions
/// waiting for the person's.
pub struct Client {
    writer: Mutex<Box<dyn Write + Send>>,
    waiting: Mutex<HashMap<u64, Sender<Result<Value, String>>>>,
    /// Each permission waiting on the person: the agent's request id, and the ids of the options it offered.
    permissions: Mutex<HashMap<String, (Value, Vec<String>)>>,
    /// Each write waiting on the person's yes (0.75.0).
    writes: Mutex<HashMap<String, Waiting>>,
    next: AtomicU64,
    root: PathBuf,
    session: Mutex<Option<String>>,
    on_event: OnEvent,
    /// The agent's output has ended: every request from then on fails at once.
    ended: AtomicBool,
}

impl Client {
    /// Starts reading what the agent writes, on a thread of its own, until it ends.
    pub fn start(
        reader: impl BufRead + Send + 'static,
        writer: impl Write + Send + 'static,
        root: &Path,
        on_event: OnEvent,
    ) -> Arc<Self> {
        let client = Arc::new(Self {
            writer: Mutex::new(Box::new(writer)),
            waiting: Mutex::new(HashMap::new()),
            permissions: Mutex::new(HashMap::new()),
            writes: Mutex::new(HashMap::new()),
            next: AtomicU64::new(1),
            root: root.canonicalize().unwrap_or_else(|_| root.to_path_buf()),
            session: Mutex::new(None),
            on_event,
            ended: AtomicBool::new(false),
        });
        let reading = Arc::clone(&client);
        std::thread::spawn(move || {
            for line in reader.lines() {
                match line {
                    Ok(line) => reading.handle(&line),
                    Err(_) => break,
                }
            }
            reading.closed();
        });
        client
    }

    fn send(&self, message: &Value) -> Result<(), String> {
        let mut writer = self.writer.lock().map_err(|_| "the agent could not be written to".to_owned())?;
        writeln!(writer, "{message}").and_then(|()| writer.flush()).map_err(|_| "the agent has ended".to_owned())
    }

    fn respond(&self, id: &Value, result: Value) {
        let _ = self.send(&json!({"jsonrpc": "2.0", "id": id, "result": result}));
    }

    fn respond_error(&self, id: &Value, code: i64, message: &str) {
        let _ = self.send(&json!({"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": message}}));
    }

    /// Asks the agent and waits for its answer.
    pub fn request(&self, method: &str, params: Value, timeout: Duration) -> Result<Value, String> {
        let id = self.next.fetch_add(1, Ordering::Relaxed);
        let (tell, hear) = mpsc::channel();
        self.waiting.lock().map_err(|_| "the request could not be kept".to_owned())?.insert(id, tell);
        // Checked after the request is kept, so an end that came first, or at the same moment, is never missed.
        if self.ended.load(Ordering::SeqCst) {
            self.forget(id);
            return Err("the agent has ended".to_owned());
        }
        if let Err(problem) = self.send(&json!({"jsonrpc": "2.0", "id": id, "method": method, "params": params})) {
            self.forget(id);
            return Err(problem);
        }
        match hear.recv_timeout(timeout) {
            Ok(answer) => answer,
            Err(RecvTimeoutError::Timeout) => {
                self.forget(id);
                Err(format!("the agent did not answer within {} seconds", timeout.as_secs()))
            }
            Err(RecvTimeoutError::Disconnected) => Err("the agent has ended".to_owned()),
        }
    }

    fn forget(&self, id: u64) {
        if let Ok(mut waiting) = self.waiting.lock() {
            waiting.remove(&id);
        }
    }

    fn notify(&self, method: &str, params: Value) {
        let _ = self.send(&json!({"jsonrpc": "2.0", "method": method, "params": params}));
    }

    fn closed(&self) {
        self.ended.store(true, Ordering::SeqCst);
        if let Ok(mut waiting) = self.waiting.lock() {
            for (_, tell) in waiting.drain() {
                let _ = tell.send(Err("the agent has ended".to_owned()));
            }
        }
        if let Ok(mut permissions) = self.permissions.lock() {
            permissions.clear();
        }
        if let Ok(mut writes) = self.writes.lock() {
            writes.clear();
        }
        (self.on_event)(Event::Ended { reason: "The agent's program has ended.".to_owned() });
    }

    /// One line from the agent: an answer to a request of ours, a notification, or a request of its own.
    pub fn handle(&self, line: &str) {
        let Ok(message) = serde_json::from_str::<Value>(line.trim()) else { return };
        let id = message.get("id").filter(|id| !id.is_null()).cloned();
        match (message["method"].as_str(), id) {
            (None, Some(id)) => {
                let Some(number) = id.as_u64() else { return };
                let tell = self.waiting.lock().ok().and_then(|mut waiting| waiting.remove(&number));
                if let Some(tell) = tell {
                    let answer = match message.get("error") {
                        Some(error) if error["code"].as_i64() == Some(AUTH_REQUIRED) => {
                            Err("it needs you to log in with its own program first".to_owned())
                        }
                        Some(error) => Err(error["message"].as_str().unwrap_or("it gave an error").to_owned()),
                        None => Ok(message["result"].clone()),
                    };
                    let _ = tell.send(answer);
                }
            }
            (Some("session/update"), None) => self.update(&message["params"]["update"]),
            (Some(method), Some(id)) => self.answer(method, &id, &message["params"]),
            _ => {}
        }
    }

    fn update(&self, update: &Value) {
        let text = |role: &str| {
            let content = &update["content"];
            (content["type"] == "text").then(|| Event::Text {
                role: role.to_owned(),
                text: content["text"].as_str().unwrap_or_default().to_owned(),
            })
        };
        let words = |key: &str| update[key].as_str().map(str::to_owned);
        let event = match update["sessionUpdate"].as_str().unwrap_or_default() {
            "agent_message_chunk" => text("agent"),
            "agent_thought_chunk" => text("thought"),
            "tool_call" | "tool_call_update" => Some(Event::Tool {
                id: update["toolCallId"].as_str().unwrap_or_default().to_owned(),
                title: words("title"),
                tool: words("kind"),
                status: words("status"),
            }),
            "plan" => Some(Event::Plan {
                entries: update["entries"]
                    .as_array()
                    .map_or(&[][..], Vec::as_slice)
                    .iter()
                    .map(|e| PlanEntry {
                        content: e["content"].as_str().unwrap_or_default().to_owned(),
                        status: e["status"].as_str().unwrap_or("pending").to_owned(),
                    })
                    .collect(),
            }),
            _ => None,
        };
        if let Some(event) = event {
            (self.on_event)(event);
        }
    }

    fn answer(&self, method: &str, id: &Value, params: &Value) {
        match method {
            "session/request_permission" => {
                let key = format!("p{}", self.next.fetch_add(1, Ordering::Relaxed));
                let call = &params["toolCall"];
                let title = call["title"]
                    .as_str()
                    .or_else(|| call["toolCallId"].as_str())
                    .unwrap_or("a step of its own")
                    .to_owned();
                let options = params["options"]
                    .as_array()
                    .map_or(&[][..], Vec::as_slice)
                    .iter()
                    .filter_map(|o| {
                        Some(PermissionOption {
                            id: o["optionId"].as_str()?.to_owned(),
                            name: o["name"].as_str().unwrap_or_default().to_owned(),
                            kind: o["kind"].as_str().unwrap_or_default().to_owned(),
                        })
                    })
                    .collect::<Vec<PermissionOption>>();
                if let Ok(mut permissions) = self.permissions.lock() {
                    permissions.insert(key.clone(), (id.clone(), options.iter().map(|o| o.id.clone()).collect()));
                }
                (self.on_event)(Event::Permission { request: key, title, options });
            }
            "fs/read_text_file" => match read_file(&self.root, params) {
                Ok((path, content)) => {
                    (self.on_event)(Event::Read { path, allowed: true, reason: None });
                    self.respond(id, json!({"content": content}));
                }
                Err((path, reason)) => {
                    (self.on_event)(Event::Read { path, allowed: false, reason: Some(reason.clone()) });
                    self.respond_error(id, INVALID_PARAMS, &format!("The Companion did not read it: {reason}."));
                }
            },
            "fs/write_text_file" => self.ask_to_write(id, params),
            other if other.starts_with("fs/") || other.starts_with("terminal/") => {
                (self.on_event)(Event::Refused { what: other.to_owned() });
                self.respond_error(
                    id,
                    METHOD_NOT_FOUND,
                    "The Companion does not let an agent run commands through it.",
                );
            }
            _ => self.respond_error(id, METHOD_NOT_FOUND, "The Companion does not offer that."),
        }
    }

    /// A write the agent asks for: checked, then shown to the person with what is there now, and kept until they answer.
    fn ask_to_write(&self, id: &Value, params: &Value) {
        let refuse = |path: String, reason: String| {
            (self.on_event)(Event::Written { path, written: false, reason: Some(reason.clone()) });
            self.respond_error(id, INVALID_PARAMS, &format!("The Companion did not write it: {reason}."));
        };
        let (shown, target) = match write_target(&self.root, params["path"].as_str().unwrap_or_default()) {
            Ok(found) => found,
            Err((path, reason)) => return refuse(path, reason),
        };
        let Some(content) = params["content"].as_str() else {
            return refuse(shown, "it gave no text to write".to_owned());
        };
        if content.len() as u64 > MAX_READ {
            return refuse(shown, format!("it is more than {} MB", MAX_READ / (1024 * 1024)));
        }
        let before = match std::fs::metadata(&target) {
            Ok(found) if found.len() > MAX_READ => {
                return refuse(shown, format!("the file there is more than {} MB", MAX_READ / (1024 * 1024)));
            }
            Ok(_) => std::fs::read(&target).ok().map(|b| String::from_utf8_lossy(&b).into_owned()),
            Err(_) => None,
        };
        let key = format!("w{}", self.next.fetch_add(1, Ordering::Relaxed));
        if let Ok(mut writes) = self.writes.lock() {
            writes.insert(
                key.clone(),
                Waiting { id: id.clone(), shown: shown.clone(), target, content: content.to_owned() },
            );
        }
        (self.on_event)(Event::Write { request: key, path: shown, before, after: content.to_owned() });
    }

    /// The person's answer to a write the agent asked for: on a yes the file is written, its folder checked again first; on a no
    /// the agent is told the person declined.
    pub fn answer_write(&self, request: &str, allow: bool) -> Result<(), String> {
        let waiting = self
            .writes
            .lock()
            .ok()
            .and_then(|mut writes| writes.remove(request))
            .ok_or_else(|| "that change is no longer waiting".to_owned())?;
        let outcome = if allow {
            // Checked again at the moment of writing, so a folder that became a link meanwhile is still caught.
            write_target(&self.root, &waiting.target.to_string_lossy()).map_err(|(_, reason)| reason).and_then(
                |(_, target)| {
                    if let Some(folder) = target.parent() {
                        std::fs::create_dir_all(folder).map_err(|e| format!("its folder could not be made: {e}"))?;
                    }
                    std::fs::write(&target, &waiting.content).map_err(|e| format!("it could not be written: {e}"))
                },
            )
        } else {
            Err("you chose not to make this change".to_owned())
        };
        match outcome {
            Ok(()) => {
                self.respond(&waiting.id, json!({}));
                (self.on_event)(Event::Written { path: waiting.shown, written: true, reason: None });
            }
            Err(reason) => {
                let message =
                    if allow { format!("The Companion did not write it: {reason}.") } else { DECLINED.to_owned() };
                self.respond_error(&waiting.id, INVALID_PARAMS, &message);
                (self.on_event)(Event::Written {
                    path: waiting.shown,
                    written: false,
                    reason: allow.then_some(reason),
                });
            }
        }
        Ok(())
    }

    /// The handshake: the protocol's version, and what the Companion offers (reading text files, and since 0.75.0 writing them on
    /// the person's yes; never a terminal).
    pub fn initialize(&self, version: &str, timeout: Duration) -> Result<Value, String> {
        let answer = self.request(
            "initialize",
            json!({
                "protocolVersion": PROTOCOL_VERSION,
                "clientCapabilities": {"fs": {"readTextFile": true, "writeTextFile": true}, "terminal": false},
                "clientInfo": {"name": "dthorga-companion", "title": "D'thorga Companion", "version": version},
            }),
            timeout,
        )?;
        if answer["protocolVersion"].as_u64() != Some(PROTOCOL_VERSION) {
            return Err(format!(
                "it speaks version {} of the protocol, and the Companion speaks {PROTOCOL_VERSION}",
                answer["protocolVersion"]
            ));
        }
        Ok(answer)
    }

    /// A new conversation, working in `cwd`, with the MCP servers given (the kit's reports).
    pub fn new_session(&self, cwd: &Path, servers: Vec<Value>, timeout: Duration) -> Result<String, String> {
        let answer = self.request("session/new", json!({"cwd": cwd, "mcpServers": servers}), timeout)?;
        let id = answer["sessionId"].as_str().ok_or("it gave no conversation")?.to_owned();
        if let Ok(mut session) = self.session.lock() {
            *session = Some(id.clone());
        }
        Ok(id)
    }

    fn session(&self) -> Result<String, String> {
        self.session.lock().ok().and_then(|s| s.clone()).ok_or_else(|| "there is no conversation yet".to_owned())
    }

    /// One message from the person; waits until the agent's turn ends, and gives why it ended.
    pub fn prompt(&self, text: &str, timeout: Duration) -> Result<String, String> {
        let session = self.session()?;
        let answer = self.request(
            "session/prompt",
            json!({"sessionId": session, "prompt": [{"type": "text", "text": text}]}),
            timeout,
        )?;
        Ok(answer["stopReason"].as_str().unwrap_or("end_turn").to_owned())
    }

    /// Asks the agent to stop its turn; every permission still waiting is answered as cancelled, as the protocol requires.
    pub fn cancel(&self) {
        if let Ok(session) = self.session() {
            self.notify("session/cancel", json!({"sessionId": session}));
        }
        let waiting: Vec<Value> =
            self.permissions.lock().map(|mut p| p.drain().map(|(_, (id, _))| id).collect()).unwrap_or_default();
        for id in waiting {
            self.respond(&id, json!({"outcome": {"outcome": "cancelled"}}));
        }
        let writes: Vec<String> = self.writes.lock().map(|w| w.keys().cloned().collect()).unwrap_or_default();
        for key in writes {
            let _ = self.answer_write(&key, false);
        }
    }

    /// The person's answer to a permission the agent asked: one of its options, or none (cancelled).
    pub fn answer_permission(&self, request: &str, option: Option<&str>) -> Result<(), String> {
        let mut permissions = self.permissions.lock().map_err(|_| "that question is no longer waiting".to_owned())?;
        let (_, offered) = permissions.get(request).ok_or_else(|| "that question is no longer waiting".to_owned())?;
        if option.is_some_and(|o| !offered.iter().any(|known| known == o)) {
            return Err("that is not one of the answers the agent offered".to_owned());
        }
        let (id, _) = permissions.remove(request).ok_or_else(|| "that question is no longer waiting".to_owned())?;
        drop(permissions);
        let outcome = match option {
            Some(option) => json!({"outcome": "selected", "optionId": option}),
            None => json!({"outcome": "cancelled"}),
        };
        self.respond(&id, json!({"outcome": outcome}));
        Ok(())
    }
}

#[cfg(test)]
#[path = "tests/acp.rs"]
mod tests;
