//! The desktop host: it reads what the window shows. The window only presents.

//! What more than one part uses, and needs no window, lives in the `companion-core` crate (`core/`): the games list, the tool kit,
//! request checks, failures. This file holds the Tauri commands, each one line of delegation on a worker thread.

mod changes_page;
mod connections_page;
mod history_page;
mod home;
mod installs_page;
mod kit_pins;
mod logs_page;
mod makeup_page;
mod open_work;
mod patch_targets;
mod pending;
mod reports;
mod settings_page;
mod shortcuts;
mod tests_page;

use companion_core::failure::{Failure, FailureCode};
use companion_core::kit;
use tauri::Manager;
use tauri::ipc::Channel;

/// Runs work that starts processes or reads files on a worker thread, so the window never waits on it.
async fn blocking<T, F>(work: F) -> Result<T, Failure>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, Failure> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|problem| Failure::new(FailureCode::ToolFailed, problem.to_string()))?
}

/// Sends each progress line of a working tool to the window, through the channel the window gave with its request. A window that
/// has gone away is not an error: the work carries on.
fn hearing(channel: Channel<kit::Progress>) -> impl Fn(kit::Progress) + Sync {
    move |progress| {
        let _ = channel.send(progress);
    }
}

/// How the tools are: read on a worker thread, since it starts a process.
#[tauri::command]
async fn kit_status() -> Result<kit::KitStatus, Failure> {
    blocking(kit::read_status).await
}

/// Where the owner left each game: read on a worker thread, since it starts git for every repository.
#[tauri::command]
async fn home_status() -> Result<home::Home, Failure> {
    blocking(home::read_home).await
}

/// The reports on offer for a game.
#[tauri::command]
async fn report_catalogue(game: String) -> Result<Vec<reports::ReportEntry>, Failure> {
    blocking(move || reports::catalogue(&game)).await
}

/// Runs one report the host agrees the window may run.
#[tauri::command]
async fn run_report(
    game: String,
    command: String,
    report: Option<String>,
    top: u32,
    on_progress: Channel<kit::Progress>,
) -> Result<reports::ReportResult, Failure> {
    blocking(move || reports::run(&game, &command, report.as_deref(), top, Some(&hearing(on_progress)))).await
}

/// This program's own data folder, where the owner's test verdicts are kept.
fn data_folder(app: &tauri::AppHandle) -> Result<std::path::PathBuf, Failure> {
    app.path().app_local_data_dir().map_err(|problem| Failure::new(FailureCode::WriteFailed, problem.to_string()))
}

/// Every test list of a game, with what the game has seen working and the owner's verdicts so far.
#[tauri::command]
async fn test_lists(app: tauri::AppHandle, game: String) -> Result<Vec<tests_page::TestList>, Failure> {
    let data = data_folder(&app)?;
    blocking(move || tests_page::read(&game, &data)).await
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
    blocking(move || tests_page::record(&game, &repository, &row, &verdict, &note, &data)).await
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
    blocking(move || tests_page::record_decision(&game, &repository, &key, &decision, &note, &data)).await
}

/// Each repository's mods: installed, in the repository and in backups, with what moving between them gains or loses.
#[tauri::command]
async fn mod_installs(
    game: String,
    on_progress: Channel<kit::Progress>,
) -> Result<Vec<installs_page::RepositoryInstalls>, Failure> {
    blocking(move || installs_page::read(&game, Some(&hearing(on_progress)))).await
}

/// Makes one move the owner asked for on the Mods page: build, install, back up, or go back to a backup.
#[tauri::command]
async fn move_install(
    game: String,
    repository: String,
    action: String,
    mods: Vec<String>,
    backup: Option<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<installs_page::MoveResult, Failure> {
    blocking(move || {
        installs_page::make_move(&game, &repository, &action, &mods, backup.as_deref(), Some(&hearing(on_progress)))
    })
    .await
}

/// Whether any active mod's textures need encoding before the next launch; None for a game with no texture check.
#[tauri::command]
async fn texture_status(
    game: String,
    on_progress: Channel<kit::Progress>,
) -> Result<Option<serde_json::Value>, Failure> {
    blocking(move || installs_page::read_textures(&game, Some(&hearing(on_progress)))).await
}

/// Encodes the named mods' textures, once the owner has confirmed.
#[tauri::command]
async fn encode_textures(
    game: String,
    mods: Vec<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<installs_page::MoveResult, Failure> {
    blocking(move || installs_page::encode_textures(&game, &mods, Some(&hearing(on_progress)))).await
}

/// What each repository's changelogs say changed lately, for any game.
#[tauri::command]
async fn changes_list(
    game: String,
    on_progress: Channel<kit::Progress>,
) -> Result<Vec<changes_page::RepositoryChanges>, Failure> {
    blocking(move || changes_page::read(&game, Some(&hearing(on_progress)))).await
}

/// The code behind one changelog entry: the commit that wrote it, and what that commit changed.
#[tauri::command]
async fn entry_code(
    game: String,
    repository: String,
    changelog: String,
    text: String,
    commit: Option<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<changes_page::EntryCode, Failure> {
    blocking(move || {
        changes_page::entry_code(&game, &repository, &changelog, &text, commit.as_deref(), Some(&hearing(on_progress)))
    })
    .await
}

/// Every fact about a game's products over time: from git, and from this PC's history log.
#[tauri::command]
async fn timeline(game: String, on_progress: Channel<kit::Progress>) -> Result<history_page::Timeline, Failure> {
    blocking(move || history_page::read(&game, Some(&hearing(on_progress)))).await
}

/// A changelog as it stood at a commit, or at a moment when no commit is named.
#[tauri::command]
async fn as_it_stood(
    game: String,
    repository: String,
    changelog: String,
    commit: Option<String>,
    when: Option<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<history_page::AsItStood, Failure> {
    blocking(move || {
        history_page::as_it_stood(
            &game,
            &repository,
            &changelog,
            commit.as_deref(),
            when.as_deref(),
            Some(&hearing(on_progress)),
        )
    })
    .await
}

/// Every setting the tools read, with where each value comes from.
#[tauri::command]
async fn settings_list(on_progress: Channel<kit::Progress>) -> Result<settings_page::SettingsReading, Failure> {
    blocking(move || settings_page::read(Some(&hearing(on_progress)))).await
}

/// Sets one setting in the central settings file, or clears it when no value is given, once the owner presses the button.
#[tauri::command]
async fn set_setting(
    key: String,
    value: Option<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<settings_page::SetResult, Failure> {
    blocking(move || settings_page::set(&key, value.as_deref(), Some(&hearing(on_progress)))).await
}

/// One question about how a repository's code connects: summary, find, around, flow or changed. The host checks it first.
#[tauri::command]
async fn connections(
    game: String,
    repository: String,
    kind: String,
    value: Option<String>,
    depth: Option<u8>,
    on_progress: Channel<kit::Progress>,
) -> Result<connections_page::Answer, Failure> {
    blocking(move || {
        let question = connections_page::question(&kind, value, depth)?;
        connections_page::ask(&game, &repository, &question, Some(&hearing(on_progress)))
    })
    .await
}

/// The game's log, grouped and compared with the run before, by the game's own log reader; says when the game has none yet.
#[tauri::command]
async fn read_log(game: String, on_progress: Channel<kit::Progress>) -> Result<logs_page::LogReading, Failure> {
    blocking(move || logs_page::read(&game, Some(&hearing(on_progress)))).await
}

/// Where a repository's code notes each of its test rows, and in which method (cross-links L3).
#[tauri::command]
async fn test_code(
    game: String,
    repository: String,
    on_progress: Channel<kit::Progress>,
) -> Result<serde_json::Value, Failure> {
    blocking(move || tests_page::code(&game, &repository, Some(&hearing(on_progress)))).await
}

/// The methods a repository patches, the other mods on each and what the last update changed (cross-links L5).
#[tauri::command]
async fn patch_targets(
    game: String,
    repository: String,
    on_progress: Channel<kit::Progress>,
) -> Result<patch_targets::PatchTargets, Failure> {
    blocking(move || patch_targets::read(&game, &repository, Some(&hearing(on_progress)))).await
}

/// Which tool kit version each of a game's repositories pins, and what a move would bring (cross-links S2).
#[tauri::command]
async fn kit_pins(game: String) -> Result<serde_json::Value, Failure> {
    blocking(move || kit_pins::read(&game)).await
}

/// One question about what a repository is made of: now, growth, churn (with how many days back) or census.
#[tauri::command]
async fn makeup(
    game: String,
    repository: String,
    kind: String,
    days: Option<u32>,
    on_progress: Channel<kit::Progress>,
) -> Result<serde_json::Value, Failure> {
    blocking(move || {
        let question = makeup_page::question(&kind, days)?;
        makeup_page::ask(&game, &repository, &question, Some(&hearing(on_progress)))
    })
    .await
}

/// The owner's keyboard shortcuts as saved; None before they change any.
#[tauri::command]
async fn read_shortcuts(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, Failure> {
    let data = data_folder(&app)?;
    blocking(move || shortcuts::read(&data)).await
}

/// Saves the owner's keyboard shortcuts in this program's own folder, once their shape is checked.
#[tauri::command]
async fn save_shortcuts(app: tauri::AppHandle, shortcuts: serde_json::Value) -> Result<serde_json::Value, Failure> {
    let data = data_folder(&app)?;
    blocking(move || shortcuts::save(&data, &shortcuts)).await
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
            encode_textures,
            changes_list,
            entry_code,
            timeline,
            as_it_stood,
            settings_list,
            set_setting,
            connections,
            read_log,
            test_code,
            patch_targets,
            kit_pins,
            makeup,
            read_shortcuts,
            save_shortcuts
        ])
        .run(tauri::generate_context!())
        .expect("the desktop window could not start");
}
