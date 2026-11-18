//! The desktop host: it reads what the window shows. The window only presents.

mod changelog;
mod failure;
mod games;
mod git;
mod home;
mod installs_page;
mod kit;
mod open_work;
mod process;
mod reports;
mod tests_page;

use failure::{Failure, FailureCode};
use tauri::Manager;

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

/// This program's own data folder, where the owner's test verdicts are kept.
fn data_folder(app: &tauri::AppHandle) -> Result<std::path::PathBuf, Failure> {
    app.path().app_local_data_dir().map_err(|problem| Failure::new(FailureCode::WriteFailed, problem.to_string()))
}

/// Every test list of a game, with what the game has seen working and the owner's verdicts so far.
#[tauri::command]
async fn test_lists(app: tauri::AppHandle, game: String) -> Result<Vec<tests_page::TestList>, Failure> {
    let data = data_folder(&app)?;
    tauri::async_runtime::spawn_blocking(move || tests_page::read(&game, &data))
        .await
        .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Records the owner's verdict on one test row, in this program's own folder.
#[tauri::command]
async fn record_verdict(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    row: String,
    verdict: String,
    note: String,
) -> Result<tests_page::Recorded, Failure> {
    let data = data_folder(&app)?;
    tauri::async_runtime::spawn_blocking(move || tests_page::record(&game, &repository, &row, &verdict, &note, &data))
        .await
        .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Records the owner's decision on a note no row names ("make a row" or "no row needed"), beside the verdicts.
#[tauri::command]
async fn record_key_decision(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    key: String,
    decision: String,
    note: String,
) -> Result<tests_page::RecordedDecision, Failure> {
    let data = data_folder(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        tests_page::record_decision(&game, &repository, &key, &decision, &note, &data)
    })
    .await
    .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Each repository's mods: installed, in the repository and in backups, with what moving between them gains or loses.
#[tauri::command]
async fn mod_installs(game: String) -> Result<Vec<installs_page::RepositoryInstalls>, Failure> {
    tauri::async_runtime::spawn_blocking(move || installs_page::read(&game))
        .await
        .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Makes one move the owner asked for on the Mods page: build, install, back up, or go back to a backup.
#[tauri::command]
async fn move_install(
    game: String,
    repository: String,
    action: String,
    mods: Vec<String>,
    backup: Option<String>,
) -> Result<installs_page::MoveResult, Failure> {
    tauri::async_runtime::spawn_blocking(move || {
        installs_page::make_move(&game, &repository, &action, &mods, backup.as_deref())
    })
    .await
    .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Whether any active mod's textures need encoding before the next launch; None for a game with no texture check.
#[tauri::command]
async fn texture_status(game: String) -> Result<Option<serde_json::Value>, Failure> {
    tauri::async_runtime::spawn_blocking(move || installs_page::read_textures(&game))
        .await
        .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Encodes the named mods' textures, once the owner has confirmed.
#[tauri::command]
async fn encode_textures(game: String, mods: Vec<String>) -> Result<installs_page::MoveResult, Failure> {
    tauri::async_runtime::spawn_blocking(move || installs_page::encode_textures(&game, &mods))
        .await
        .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Starts the program.
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            kit_status,
            home_status,
            report_catalogue,
            run_report,
            test_lists,
            record_verdict,
            record_key_decision,
            mod_installs,
            move_install,
            texture_status,
            encode_textures
        ])
        .run(tauri::generate_context!())
        .expect("the desktop window could not start");
}
