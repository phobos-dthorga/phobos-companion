//! The desktop host: it reads what the window shows. The window only presents.

mod changelog;
mod failure;
mod games;
mod git;
mod home;
mod kit;
mod open_work;
mod process;
mod reports;

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

/// The reports on offer for a game.
#[tauri::command]
async fn report_catalogue(game: String) -> Result<Vec<reports::ReportEntry>, Failure> {
    tauri::async_runtime::spawn_blocking(move || reports::catalogue(&game))
        .await
        .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Runs one report the host agrees the window may run.
#[tauri::command]
async fn run_report(
    game: String,
    command: String,
    report: Option<String>,
    top: u32,
) -> Result<reports::ReportResult, Failure> {
    tauri::async_runtime::spawn_blocking(move || reports::run(&game, &command, report.as_deref(), top))
        .await
        .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Starts the program.
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![kit_status, home_status, report_catalogue, run_report])
        .run(tauri::generate_context!())
        .expect("the desktop window could not start");
}
