//! Commands an agent runs through the Companion (0.84.0; `docs/ai.md`, "Commands"): the Agent Client Protocol's terminals. Game-free.
//!
//! A command runs as its own program, never through a shell the Companion adds: the agent's own words, in a folder of the repository
//! (`acp` checks which before it gets here, and `commands` sorts it first). Its output and errors are kept together, at most
//! `limit` bytes, the oldest dropped first and at a character's edge, as the protocol asks. It has no input, its window is hidden,
//! and it ends, with everything it started, when it is killed, when its terminal is released, when the person presses Stop, or
//! after `MAX_RUN`.

use crate::acp::find_on_path;
use crate::process;
use serde::Serialize;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc;
use std::sync::{Arc, Condvar, Mutex};
use std::time::{Duration, Instant};

/// Output kept when the agent names no limit, and the most it may name.
pub const DEFAULT_OUTPUT: usize = 1024 * 1024;
pub const MAX_OUTPUT: usize = 4 * 1024 * 1024;
/// The longest a command may run before it is ended.
pub const MAX_RUN: Duration = Duration::from_secs(30 * 60);
/// The end of a command's output the page is given when it ends.
const TAIL: usize = 4_000;
const POLL: Duration = Duration::from_millis(50);

/// How a command ended: its exit code, or the signal that ended it (on systems that have signals).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Exit {
    pub exit_code: Option<i32>,
    pub signal: Option<String>,
}

#[derive(Default)]
struct Kept {
    bytes: Vec<u8>,
    truncated: bool,
    exit: Option<Exit>,
}

/// One command running, or run.
pub struct Terminal {
    child: Mutex<Child>,
    kept: Arc<(Mutex<Kept>, Condvar)>,
}

/// What a terminal has given so far.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Output {
    pub text: String,
    pub truncated: bool,
    pub exit: Option<Exit>,
}

fn keep(kept: &Mutex<Kept>, chunk: &[u8], limit: usize) {
    let Ok(mut kept) = kept.lock() else { return };
    kept.bytes.extend_from_slice(chunk);
    if kept.bytes.len() > limit {
        let mut cut = kept.bytes.len() - limit;
        // Never in the middle of a character: past any continuation bytes.
        while cut < kept.bytes.len() && kept.bytes[cut] & 0xC0 == 0x80 {
            cut += 1;
        }
        kept.bytes.drain(..cut);
        kept.truncated = true;
    }
}

fn exit_of(status: std::process::ExitStatus) -> Exit {
    #[cfg(unix)]
    let signal = {
        use std::os::unix::process::ExitStatusExt;
        status.signal().map(|n| format!("signal {n}"))
    };
    #[cfg(not(unix))]
    let signal = None;
    Exit { exit_code: status.code(), signal }
}

/// The program a command names: a bare name found on the search path as a shell finds it (a `.cmd` on Windows), a path as given.
fn program(name: &str) -> PathBuf {
    if name.contains(['/', '\\']) {
        PathBuf::from(name)
    } else {
        find_on_path(name).unwrap_or_else(|| PathBuf::from(name))
    }
}

/// Starts a command; `ended` hears how it ended and the end of its output, once its output is read.
pub fn start(
    name: &str,
    args: &[String],
    cwd: &Path,
    env: &[(String, String)],
    limit: usize,
    ended: impl FnOnce(Exit, String, bool) + Send + 'static,
) -> Result<Arc<Terminal>, String> {
    let mut command = Command::new(program(name));
    command.args(args).current_dir(cwd).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
    for (key, value) in env {
        command.env(key, value);
    }
    process::hide_console(&mut command);
    process::own_group(&mut command);
    let mut child = command.spawn().map_err(|e| format!("{name} could not be started: {e}"))?;
    let kept: Arc<(Mutex<Kept>, Condvar)> = Arc::default();
    let (done, finished) = mpsc::channel::<()>();
    let readers: Vec<Box<dyn Read + Send>> = [
        child.stdout.take().map(|s| Box::new(s) as Box<dyn Read + Send>),
        child.stderr.take().map(|s| Box::new(s) as Box<dyn Read + Send>),
    ]
    .into_iter()
    .flatten()
    .collect();
    let streams = readers.len();
    for mut reader in readers {
        let kept = Arc::clone(&kept);
        let done = done.clone();
        std::thread::spawn(move || {
            let mut chunk = [0u8; 8192];
            while let Ok(count) = reader.read(&mut chunk) {
                if count == 0 {
                    break;
                }
                keep(&kept.0, &chunk[..count], limit);
            }
            let _ = done.send(());
        });
    }
    let terminal = Arc::new(Terminal { child: Mutex::new(child), kept });
    let watching = Arc::clone(&terminal);
    std::thread::spawn(move || {
        let started = Instant::now();
        let exit = loop {
            let status = watching.child.lock().ok().and_then(|mut c| c.try_wait().ok().flatten());
            if let Some(status) = status {
                break exit_of(status);
            }
            if started.elapsed() > MAX_RUN {
                watching.kill();
            }
            std::thread::sleep(POLL);
        };
        // The last of its output, unless something it started still holds the output open.
        for _ in 0..streams {
            if finished.recv_timeout(Duration::from_secs(2)).is_err() {
                break;
            }
        }
        let (tail, truncated) = {
            let (lock, wake) = &*watching.kept;
            let Ok(mut kept) = lock.lock() else { return };
            kept.exit = Some(exit.clone());
            wake.notify_all();
            let text = String::from_utf8_lossy(&kept.bytes).into_owned();
            let from = text.char_indices().map(|(i, _)| i).find(|&i| i + TAIL >= text.len()).unwrap_or(0);
            (text[from..].to_owned(), kept.truncated || from > 0)
        };
        ended(exit, tail, truncated);
    });
    Ok(terminal)
}

impl Terminal {
    /// The output so far, whether some was dropped, and how it ended if it has.
    pub fn output(&self) -> Output {
        let Ok(kept) = self.kept.0.lock() else {
            return Output { text: String::new(), truncated: false, exit: None };
        };
        Output {
            text: String::from_utf8_lossy(&kept.bytes).into_owned(),
            truncated: kept.truncated,
            exit: kept.exit.clone(),
        }
    }

    /// Waits until it ends.
    pub fn wait(&self) -> Exit {
        let (lock, wake) = &*self.kept;
        let Ok(mut kept) = lock.lock() else { return Exit { exit_code: None, signal: None } };
        loop {
            if let Some(exit) = &kept.exit {
                return exit.clone();
            }
            kept = match wake.wait(kept) {
                Ok(kept) => kept,
                Err(_) => return Exit { exit_code: None, signal: None },
            };
        }
    }

    /// Ends it, with everything it started; one that has ended is left as it is.
    pub fn kill(&self) {
        if let Ok(mut child) = self.child.lock() {
            process::end_tree(&mut child);
        }
    }
}

#[cfg(test)]
#[path = "tests/terminals.rs"]
mod tests;
