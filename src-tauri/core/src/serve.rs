//! A kit command that stays running and answers one JSON request a line (phobos-modkit's `serve` reports, such as a game's
//! `look-serve`, which holds a snapshot of the running game): started as every kit command is, but with its input kept open.
//!
//! Its first line on standard output says whether it is ready. Then each request written on its input carries an `id`, and the
//! line that repeats that `id` is its answer; any other line is passed over. A line `{"event": "released", "reason"}` means the
//! command let go of what it held by itself, and the end of its output means it has ended. Standard output and standard error are
//! read on threads of their own into one channel, so neither pipe can fill and stall the other; progress lines on standard error
//! go to the listener of the request being answered, and anything else it says is kept for a failure's details.

use crate::failure::Failure;
use crate::kit::{self, Listener, parse_progress};
use crate::process::end_tree;
use serde_json::Value;
use std::io::{BufRead, BufReader, Read, Write};
use std::process::{Child, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError};
use std::sync::{Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant};

/// How much of what the command says on standard error (that is not progress) is kept, for a failure's details.
const SAID_KEPT: usize = 4000;
/// How often a close looks whether the command has ended by itself.
const CLOSE_LOOK: Duration = Duration::from_millis(50);
const RELEASED: &str = "released";

/// One thing the command wrote, in the order it arrived.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Heard {
    /// A line of standard output.
    Out(String),
    /// A line of standard error: a progress line, or its own words.
    Err(String),
    /// Standard output has ended: the command has ended, or closed it.
    OutEnded,
}

/// What came of waiting for an answer.
#[derive(Debug, Clone, PartialEq)]
pub enum Reply {
    /// The line answering the request (or, for the first line, whatever the command said first).
    Answer(Value),
    /// The command let go of what it held by itself, with its reason.
    Released(String),
    /// The command ended, with what it said on standard error that was not progress.
    Ended(String),
    /// Nothing answered in the time given.
    TimedOut,
}

/// A line of standard output, sorted: the answer to request `id` (any JSON object, for the first line, when `id` is None), word
/// that the command let go of what it held, or nothing this request is waiting for.
pub fn sort_line(line: &str, id: Option<u64>) -> Option<Reply> {
    let value: Value = serde_json::from_str(line.trim()).ok()?;
    if !value.is_object() {
        return None;
    }
    if value["event"].as_str() == Some(RELEASED) {
        return Some(Reply::Released(value["reason"].as_str().unwrap_or_default().to_owned()));
    }
    match id {
        None => Some(Reply::Answer(value)),
        Some(id) if value["id"].as_u64() == Some(id) => Some(Reply::Answer(value)),
        Some(_) => None,
    }
}

/// A running kit command that answers requests one at a time. Dropping it closes it.
pub struct Served {
    child: Mutex<Option<Child>>,
    input: Mutex<Option<Box<dyn Write + Send>>>,
    heard: Mutex<Receiver<Heard>>,
    said: Mutex<String>,
    next: AtomicU64,
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(std::sync::PoisonError::into_inner)
}

fn read_lines(from: impl Read, mut each: impl FnMut(String) -> bool) {
    let mut reader = BufReader::new(from);
    let mut raw = Vec::new();
    while matches!(reader.read_until(b'\n', &mut raw), Ok(read) if read > 0) {
        if !each(String::from_utf8_lossy(&raw).into_owned()) {
            return;
        }
        raw.clear();
    }
}

impl Served {
    /// Starts the kit with these arguments, its input kept open for requests. Progress lines are always asked for: the requests
    /// that take time are the reason such a command exists.
    pub fn start(arguments: &[String]) -> Result<Self, Failure> {
        let mut command = kit::kit_command(arguments, true)?;
        command.stdin(Stdio::piped());
        let mut child = command.spawn().map_err(kit::not_started)?;
        let input = child.stdin.take().expect("standard input was piped");
        let output = child.stdout.take().expect("standard output was piped");
        let errors = child.stderr.take().expect("standard error was piped");
        Ok(Self::from_parts(Some(child), Box::new(input), output, errors))
    }

    /// A served command from its parts: a process (none in tests), where requests are written, and what it writes back.
    pub fn from_parts(
        child: Option<Child>,
        input: Box<dyn Write + Send>,
        output: impl Read + Send + 'static,
        errors: impl Read + Send + 'static,
    ) -> Self {
        let (send, receive) = mpsc::channel();
        let out = send.clone();
        thread::spawn(move || {
            read_lines(output, |line| out.send(Heard::Out(line)).is_ok());
            let _ = out.send(Heard::OutEnded);
        });
        thread::spawn(move || read_lines(errors, |line| send.send(Heard::Err(line)).is_ok()));
        Self {
            child: Mutex::new(child),
            input: Mutex::new(Some(input)),
            heard: Mutex::new(receive),
            said: Mutex::new(String::new()),
            next: AtomicU64::new(0),
        }
    }

    /// The command's first line: whether it is ready, or why not. Waits at most `wait`.
    pub fn first(&self, listener: Option<Listener>, wait: Duration) -> Reply {
        let heard = lock(&self.heard);
        self.wait(&heard, None, listener, Some(Instant::now() + wait))
    }

    /// Writes one request with the next `id` and waits for its answer, passing progress to the listener, until `until` when one
    /// is given. One request is answered at a time: a second waits for the first.
    pub fn ask(&self, request: &Value, listener: Option<Listener>, until: Option<Instant>) -> Reply {
        let heard = lock(&self.heard);
        let id = self.next.fetch_add(1, Ordering::SeqCst) + 1;
        let mut request = request.clone();
        request["id"] = Value::from(id);
        let written = match lock(&self.input).as_mut() {
            Some(input) => writeln!(input, "{request}").and_then(|()| input.flush()).is_ok(),
            None => false,
        };
        if !written {
            return Reply::Ended(self.said());
        }
        self.wait(&heard, Some(id), listener, until)
    }

    fn wait(
        &self,
        heard: &Receiver<Heard>,
        id: Option<u64>,
        listener: Option<Listener>,
        until: Option<Instant>,
    ) -> Reply {
        loop {
            let next = match until {
                Some(until) => match heard.recv_timeout(until.saturating_duration_since(Instant::now())) {
                    Ok(next) => next,
                    Err(RecvTimeoutError::Timeout) => return Reply::TimedOut,
                    Err(RecvTimeoutError::Disconnected) => Heard::OutEnded,
                },
                None => heard.recv().unwrap_or(Heard::OutEnded),
            };
            if let Some(reply) = self.step(next, id, listener) {
                return reply;
            }
        }
    }

    /// One thing heard while waiting for request `id`: the reply, when it settles the wait.
    pub fn step(&self, heard: Heard, id: Option<u64>, listener: Option<Listener>) -> Option<Reply> {
        match heard {
            Heard::Out(line) => sort_line(&line, id),
            Heard::Err(line) => {
                match (parse_progress(&line), listener) {
                    (Some(progress), Some(hear)) => hear(progress),
                    (Some(_), None) => {}
                    (None, _) => {
                        let mut said = lock(&self.said);
                        said.push_str(&line);
                        if said.len() > SAID_KEPT {
                            let cut = said.len() - SAID_KEPT;
                            let cut = (cut..said.len()).find(|&at| said.is_char_boundary(at)).unwrap_or(said.len());
                            said.drain(..cut);
                        }
                    }
                }
                None
            }
            Heard::OutEnded => Some(Reply::Ended(self.said())),
        }
    }

    /// What the command said on standard error that was not progress, the latest part.
    pub fn said(&self) -> String {
        lock(&self.said).trim().to_owned()
    }

    /// Whether the process is still running (always false with no process).
    pub fn running(&self) -> bool {
        lock(&self.child).as_mut().is_some_and(|child| matches!(child.try_wait(), Ok(None)))
    }

    /// Closes the command's input, the polite way to end it, and waits up to `grace` for it to end by itself; then ends it and
    /// anything it started. Safe to call more than once, and from another thread while a request waits: that request then hears
    /// the end of the output.
    pub fn close(&self, grace: Duration) {
        drop(lock(&self.input).take());
        let Some(mut child) = lock(&self.child).take() else {
            return;
        };
        let until = Instant::now() + grace;
        while Instant::now() < until {
            match child.try_wait() {
                Ok(Some(_)) => return,
                Ok(None) => thread::sleep(CLOSE_LOOK),
                Err(_) => break,
            }
        }
        end_tree(&mut child);
    }
}

impl Drop for Served {
    fn drop(&mut self) {
        self.close(Duration::from_secs(2));
    }
}

#[cfg(test)]
#[path = "tests/serve.rs"]
mod tests;
