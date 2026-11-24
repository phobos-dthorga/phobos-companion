//! The updater (0.85.0; `docs/releases.md`, O1; the owner's choices by card, 25 Nov 2026: "I think we should integrate an
//! auto-updater", fetching in the background and installing when the Companion closes, with Install now).
//!
//! Once, a few seconds after the program starts, when the `updates` kind is on in Settings → Going online and the owner's public
//! update key is in `tauri.conf.json`, it reads `latest.json` from the latest **published** release on GitHub (a draft reaches no
//! one). A newer version is fetched at once, checked against the key, and kept in memory. **It installs when the program closes**,
//! without opening again, or at once on Install now, which opens the new version. Tauri's own updater does the reading, checking
//! and installing; this module only decides when, and says how it stands. The window only asks.

use companion_core::online;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

/// The kind's id in Settings → Going online.
pub const KIND: &str = "updates";
/// How long after the program starts it looks, so the first page is never held up.
const DELAY: Duration = Duration::from_secs(5);
/// How long reading `latest.json` or the installer may take before it gives up.
const TIMEOUT: Duration = Duration::from_secs(10 * 60);

/// How the updater stands, as the window shows it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "state", rename_all = "kebab-case")]
pub enum Status {
    /// Switched off in Settings → Going online.
    Off,
    /// The owner's public update key is not in the program yet (`docs/releases.md`, the owner's one-time setup).
    NotSetUp,
    /// Releases are built for Windows only so far.
    Elsewhere,
    /// The program has just started; it looks in a moment.
    Waiting,
    Checking,
    /// GitHub has no published version to offer, as of `checked` (Unix seconds): every release is still a draft, or none was
    /// made. The updater hears this as "not found" (0.86.1: shown as a failure before, which it is not).
    NothingPublished {
        checked: u64,
    },
    /// The newest published version is this one, as of `checked` (Unix seconds).
    Current {
        checked: u64,
    },
    /// A newer version is being fetched.
    Fetching {
        version: String,
        got: u64,
        total: Option<u64>,
    },
    /// A newer version is fetched and checked, and installs when the program closes.
    Ready {
        version: String,
        notes: Option<String>,
        date: Option<String>,
    },
    Failed {
        reason: String,
    },
}

static STATUS: Mutex<Status> = Mutex::new(Status::Waiting);
/// The update fetched and checked, with its installer's bytes.
static READY: Mutex<Option<(Update, Vec<u8>)>> = Mutex::new(None);

fn set(status: Status) {
    if let Ok(mut now) = STATUS.lock() {
        *now = status;
    }
}

pub fn status() -> Status {
    STATUS.lock().map(|s| s.clone()).unwrap_or(Status::Waiting)
}

/// Whether the program carries the owner's public update key (an empty one means the setup is not done).
pub fn key_set(plugins: &serde_json::Value) -> bool {
    plugins["updater"]["pubkey"].as_str().is_some_and(|key| !key.trim().is_empty())
}

fn unix_now() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or_default()
}

/// What stops it looking, if anything: off, not set up, or not Windows.
fn barred(app: &AppHandle, data: &std::path::Path) -> Option<Status> {
    if !online::is_on(data, KIND) {
        return Some(Status::Off);
    }
    let plugins = serde_json::to_value(&app.config().plugins).unwrap_or_default();
    if !key_set(&plugins) {
        return Some(Status::NotSetUp);
    }
    if !cfg!(windows) {
        return Some(Status::Elsewhere);
    }
    None
}

/// Looks for a newer published version and fetches it; says how it went.
async fn look(app: AppHandle, data: PathBuf) {
    if let Some(barred) = barred(&app, &data) {
        return set(barred);
    }
    if READY.lock().is_ok_and(|r| r.is_some()) {
        return;
    }
    set(Status::Checking);
    let checked = match app.updater_builder().timeout(TIMEOUT).build() {
        Ok(updater) => updater.check().await,
        Err(problem) => Err(problem),
    };
    let update = match checked {
        Ok(Some(update)) => update,
        Ok(None) => return set(Status::Current { checked: unix_now() }),
        // The address answered, but not with a release: nothing is published there yet. A network fault is another error.
        Err(tauri_plugin_updater::Error::ReleaseNotFound) => {
            return set(Status::NothingPublished { checked: unix_now() });
        }
        Err(problem) => return set(Status::Failed { reason: problem.to_string() }),
    };
    let version = update.version.clone();
    let notes = update.body.clone();
    let date = update.date.map(|d| d.to_string());
    set(Status::Fetching { version: version.clone(), got: 0, total: None });
    let mut got = 0u64;
    let fetched = update
        .download(
            |chunk, total| {
                got += chunk as u64;
                set(Status::Fetching { version: version.clone(), got, total });
            },
            || {},
        )
        .await;
    match fetched {
        Ok(bytes) => {
            if let Ok(mut ready) = READY.lock() {
                *ready = Some((update, bytes));
            }
            set(Status::Ready { version, notes, date });
        }
        Err(problem) => set(Status::Failed { reason: problem.to_string() }),
    }
}

/// At start: looks once, a few seconds after the program opens.
pub fn start(app: &AppHandle) {
    let Ok(data) = app.path().app_local_data_dir() else { return };
    let app = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(DELAY);
        tauri::async_runtime::block_on(look(app, data));
    });
}

/// Looks again now, on the person's press (Check again).
pub fn check_now(app: &AppHandle) {
    let Ok(data) = app.path().app_local_data_dir() else { return };
    let app = app.clone();
    tauri::async_runtime::spawn(look(app, data));
}

/// Installs the update fetched, if there is one: the installer runs and the program ends (on Windows, Tauri's updater exits the
/// program itself). `reopen` opens the new version after it installs.
fn install(reopen: bool) -> Result<(), String> {
    let taken = READY.lock().ok().and_then(|mut r| r.take());
    let Some((update, bytes)) = taken else { return Err("no update is ready to install".to_owned()) };
    update.restart_after_install(reopen).install(bytes).map_err(|e| e.to_string())
}

/// Install now: the update installs at once and the new version opens. What closing does first is done first.
pub fn install_now(before_exit: impl FnOnce()) -> Result<(), String> {
    if !READY.lock().is_ok_and(|r| r.is_some()) {
        return Err("no update is ready to install".to_owned());
    }
    before_exit();
    install(true)
}

/// When the program closes: an update that is ready installs, and the program does not open again.
pub fn install_on_exit() {
    let _ = install(false);
}

#[cfg(test)]
#[path = "tests/updates.rs"]
mod tests;
