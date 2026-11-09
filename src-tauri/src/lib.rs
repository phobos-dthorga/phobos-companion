//! The desktop host: it reads what the window shows. The window only presents.

mod changelog;
mod failure;
mod games;
mod git;
mod home;
mod kit;
mod open_work;
mod process;

use failure::{Failure, FailureCode};

/// How the tools are: read on a worker thread, since it starts a process.
#[tauri::command]
async fn kit_status() -> Result<kit::KitStatus, Failure> {
    tauri::async_runtime::spawn_blocking(kit::read_status)
        .await
        .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Where the owner left each game: read on a worker thread, since it starts git for every repository.
#[tauri::command]
async fn home_status() -> Result<home::Home, Failure> {
    tauri::async_runtime::spawn_blocking(home::read_home)
        .await
        .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Starts the program.
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![kit_status, home_status])
        .run(tauri::generate_context!())
        .expect("the desktop window could not start");
}
