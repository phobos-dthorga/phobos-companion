//! The Chat page (0.74.0; `docs/ai.md`, A3; the owner, 23 Nov 2026: "go ahead with A3", and of its switch starting off: "a very
//! good choice"). A whole agent (Claude, Codex, Gemini CLI and others, from `config/chat-agents.json`) runs as its own program in a
//! repository from the games list, and the page talks to it through the Agent Client Protocol (`companion_core::acp`).
//!
//! **Its switch starts off** (risk graded high: an agent can change or delete files in the repository by itself, at once), kept with
//! the chosen agent in `chat.json`. The program starts only the command the agents file names, found by name on the search path,
//! **never installs one and never passes a login**. Through the Companion the agent may read text files inside the repository, ask
//! the person's permission, and since 0.75.0 (slice 5) write a text file there **only after the person saw exactly what would
//! change and said yes**; commands through it are refused. It is handed the tool kit's MCP server (the
//! reports that read). One agent runs at a time; leaving the page, starting another or closing the program ends its whole process
//! tree.

use crate::ai_programs;
use companion_core::acp::{self, Client, OnEvent};
use companion_core::failure::Failure;
use companion_core::{games, prefs, process};
use serde::Serialize;
use serde_json::{Value, json};
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;

const FILE: &str = "chat.json";
const VERSION: u64 = 1;
/// How long an agent may take to start and open a conversation.
const START: Duration = Duration::from_secs(120);
/// How long one turn may run.
const TURN: Duration = Duration::from_secs(60 * 60);
const MAX_MESSAGE: usize = 20_000;
const KEPT_SAID: usize = 2_000;

struct Running {
    client: Arc<Client>,
    child: Child,
    agent: String,
    repository: String,
}

static RUNNING: Mutex<Option<Running>> = Mutex::new(None);

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentStatus {
    pub id: String,
    pub name: String,
    /// Whether its command is on this computer's search path.
    pub found: bool,
    pub get: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    /// Whether the Chat page is switched on (it starts off).
    pub on: bool,
    pub chosen: Option<String>,
    pub agents: Vec<AgentStatus>,
    /// The agent running now, and where.
    pub running: Option<RunningStatus>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct RunningStatus {
    pub agent: String,
    pub repository: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Started {
    pub agent: String,
    pub repository: String,
    /// Whether the agent was handed the tool kit's reports.
    pub kit_reports: bool,
}

fn kept(data: &Path) -> (bool, Option<String>) {
    let file = prefs::read_json(&data.join(FILE)).ok().flatten().unwrap_or(Value::Null);
    let chosen = file["agent"].as_str().filter(|id| acp::agent(id).is_ok()).map(str::to_owned);
    (file["on"].as_bool() == Some(true), chosen)
}

fn keep(data: &Path, on: bool, agent: Option<&str>) -> Result<(), Failure> {
    prefs::write_json(&data.join(FILE), &json!({"version": VERSION, "on": on, "agent": agent}))
}

/// The switch, the agents with whether each is on this computer, and the one running.
pub fn status(data: &Path) -> Status {
    let (on, chosen) = kept(data);
    let agents = acp::agents()
        .iter()
        .map(|a| AgentStatus {
            id: a.id.clone(),
            name: a.name.clone(),
            found: acp::find_on_path(&a.command).is_some(),
            get: a.get.clone(),
        })
        .collect();
    let running = RUNNING
        .lock()
        .ok()
        .and_then(|r| r.as_ref().map(|r| RunningStatus { agent: r.agent.clone(), repository: r.repository.clone() }));
    Status { on, chosen, agents, running }
}

/// Switches the Chat page on or off; off also ends an agent that is running.
pub fn switch(data: &Path, on: bool) -> Result<Status, Failure> {
    let (_, chosen) = kept(data);
    keep(data, on, chosen.as_deref())?;
    if !on {
        end()?;
    }
    Ok(status(data))
}

/// Keeps the chosen agent.
pub fn choose(data: &Path, agent: &str) -> Result<Status, Failure> {
    acp::agent(agent)?;
    let (on, _) = kept(data);
    keep(data, on, Some(agent))?;
    Ok(status(data))
}

/// The tool kit's MCP server, as the protocol hands one to an agent: the kit's own `mcp setup` lines, with an absolute command.
fn kit_server() -> Option<Value> {
    let setup = ai_programs::read().ok()?;
    let command = setup["command"].as_str().filter(|c| Path::new(c).is_absolute())?;
    let env: Vec<Value> = setup["env"]
        .as_object()
        .map(|e| e.iter().map(|(name, value)| json!({"name": name, "value": value})).collect())
        .unwrap_or_default();
    Some(json!({"name": setup["name"], "command": command, "args": setup["args"], "env": env}))
}

fn said_tail(said: &Arc<Mutex<String>>) -> String {
    let said = said.lock().map(|s| s.trim().to_owned()).unwrap_or_default();
    if said.is_empty() { String::new() } else { format!(" It said: {said}") }
}

/// Starts the chosen agent in a repository of the game, and opens a conversation; ends any agent running first.
pub fn start(data: &Path, game: &str, repository: &str, on_event: OnEvent) -> Result<Started, Failure> {
    let (on, chosen) = kept(data);
    if !on {
        return Err(Failure::refused("the Chat page is switched off in Settings → AI"));
    }
    let agent =
        acp::agent(&chosen.ok_or_else(|| Failure::refused("no agent is chosen yet: choose one in Settings → AI"))?)?;
    let program = acp::find_on_path(&agent.command).ok_or_else(|| {
        Failure::refused(format!(
            "{} is not on this computer (no {} on the search path). {}",
            agent.name, agent.command, agent.get
        ))
    })?;
    let found = games::named_repository(game, repository)?;
    end()?;
    let mut command = Command::new(&program);
    command
        .args(&agent.args)
        .current_dir(&found.path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    process::hide_console(&mut command);
    process::own_group(&mut command);
    let mut child =
        command.spawn().map_err(|e| Failure::refused(format!("{} could not be started: {e}", agent.name)))?;
    let (Some(input), Some(output), Some(errors)) = (child.stdin.take(), child.stdout.take(), child.stderr.take())
    else {
        process::end_tree(&mut child);
        return Err(Failure::refused(format!("{} could not be started", agent.name)));
    };
    let said = Arc::new(Mutex::new(String::new()));
    let keep_said = Arc::clone(&said);
    std::thread::spawn(move || {
        for line in BufReader::new(errors).lines().map_while(Result::ok) {
            if let Ok(mut said) = keep_said.lock() {
                said.push_str(&line);
                said.push('\n');
                let over = said.len().saturating_sub(KEPT_SAID);
                if over > 0 {
                    let cut = said.char_indices().map(|(i, _)| i).find(|&i| i >= over).unwrap_or(0);
                    said.drain(..cut);
                }
            }
        }
    });
    let client = Client::start(BufReader::new(output), input, &found.path, on_event);
    let failed = |child: &mut Child, problem: String| {
        process::end_tree(child);
        Failure::refused(format!("{} did not start: {problem}.{}", agent.name, said_tail(&said)))
    };
    if let Err(problem) = client.initialize(env!("CARGO_PKG_VERSION"), START) {
        return Err(failed(&mut child, problem));
    }
    let server = kit_server();
    let kit_reports = server.is_some();
    if let Err(problem) = client.new_session(&found.path, server.into_iter().collect(), START) {
        return Err(failed(&mut child, problem));
    }
    *RUNNING.lock().map_err(|_| Failure::refused("the agent could not be kept"))? =
        Some(Running { client, child, agent: agent.name.clone(), repository: found.name.clone() });
    Ok(Started { agent: agent.name.clone(), repository: found.name, kit_reports })
}

fn client() -> Result<Arc<Client>, Failure> {
    RUNNING
        .lock()
        .ok()
        .and_then(|r| r.as_ref().map(|r| Arc::clone(&r.client)))
        .ok_or_else(|| Failure::refused("no agent is running: start one first"))
}

/// One message from the person; returns when the agent's turn ends, with why it ended.
pub fn prompt(text: &str) -> Result<String, Failure> {
    let text = text.trim();
    if text.is_empty() || text.chars().count() > MAX_MESSAGE {
        return Err(Failure::refused(format!("a message is some words, at most {MAX_MESSAGE} characters")));
    }
    client()?.prompt(text, TURN).map_err(|problem| Failure::refused(format!("The agent did not answer: {problem}.")))
}

/// Asks the agent to stop its turn; every permission still waiting is answered as cancelled.
pub fn cancel() -> Result<(), Failure> {
    client()?.cancel();
    Ok(())
}

/// The person's answer to a permission the agent asked: one of the options it offered, or none.
pub fn answer_permission(request: &str, option: Option<&str>) -> Result<(), Failure> {
    client()?.answer_permission(request, option).map_err(Failure::refused)
}

/// The person's answer to a change the agent asked to make through the Companion (0.75.0): written on a yes, declined on a no.
pub fn answer_write(request: &str, allow: bool) -> Result<(), Failure> {
    client()?.answer_write(request, allow).map_err(Failure::refused)
}

/// Ends the agent running, with every process it started. Ending none is not an error.
pub fn end() -> Result<(), Failure> {
    let running = RUNNING.lock().ok().and_then(|mut r| r.take());
    if let Some(mut running) = running {
        running.client.cancel();
        process::end_tree(&mut running.child);
    }
    Ok(())
}

#[cfg(test)]
#[path = "tests/chat_page.rs"]
mod tests;
