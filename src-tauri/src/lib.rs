//! The desktop host: it reads what the window shows. The window only presents.

//! What more than one part uses, and needs no window, lives in the `companion-core` crate (`core/`): the games list, the tool kit,
//! request checks, failures. This file holds the Tauri commands, each one line of delegation on a worker thread.

mod about_page;
mod ai_help;
mod ai_programs;
mod ai_tools;
mod changed_files;
mod changes_page;
mod chat_page;
mod claims_board;
mod cleanup_page;
mod code_colours_page;
mod connections_page;
mod crash_look;
mod decisions_page;
mod explorer_page;
mod game_files_page;
mod game_key;
mod games_page;
mod history_page;
mod home;
mod installs_page;
mod kit_pins;
mod logs_page;
mod lookup;
mod makeup_page;
mod memory_page;
mod mod_list_databases;
mod mod_list_lists;
mod mod_list_page;
mod mod_list_steam;
mod nightly;
mod open_work;
mod other_code_page;
mod patch_targets;
mod pending;
mod pick;
mod picks_page;
mod pictures;
mod publish_page;
mod records_backup;
mod repo_status;
mod report_links;
mod report_page;
mod reports;
mod safe_copies;
mod screen_notes;
mod settings_ledger;
mod settings_page;
mod setup_page;
mod shortcuts;
mod tests_page;
mod themes_page;
mod updates;
mod viewable;

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

/// What this program is: its version, what it was built from and when, and what its repository holds since (0.25.0).
#[tauri::command]
async fn about(app: tauri::AppHandle) -> Result<about_page::About, Failure> {
    blocking(move || Ok(about_page::read(data_folder(&app).ok()))).await
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

/// What closing the program does first: a snapshot of the running game is never left held (owner's choice, 20 Nov 2026), and an
/// agent ends with everything it started. Install now (0.85.0) does it too, before the installer takes over.
fn before_exit() {
    explorer_page::release_at_exit();
    let _ = chat_page::end();
}

/// The computer's activity over the last minute, with the Companion's share (0.86.0), for the status bar. Only reads.
#[tauri::command]
fn activity() -> Vec<companion_core::activity::Sample> {
    companion_core::activity::recent()
}

/// How the updater stands (0.85.0, `docs/releases.md`). Only reads.
#[tauri::command]
fn updates_status() -> updates::Status {
    updates::status()
}

/// Looks for a newer published version again, on the person's press.
#[tauri::command]
fn updates_check(app: tauri::AppHandle) -> updates::Status {
    updates::check_now(&app);
    updates::status()
}

/// Installs the update that is ready at once, and opens the new version: on the person's press.
#[tauri::command]
async fn updates_install() -> Result<(), Failure> {
    blocking(|| updates::install_now(before_exit).map_err(Failure::refused)).await
}

/// How the setup stands (0.87.0): what the pages use beyond the Companion, and whether each is here. Only reads.
#[tauri::command]
async fn setup_status(app: tauri::AppHandle) -> Result<setup_page::Setup, Failure> {
    let data = data_folder(&app)?;
    blocking(move || setup_page::read(&data)).await
}

/// Looks again on the person's press: Windows' search path is read afresh and an ended fetch is forgotten.
#[tauri::command]
async fn setup_look_again(app: tauri::AppHandle) -> Result<setup_page::Setup, Failure> {
    let data = data_folder(&app)?;
    blocking(move || setup_page::look_again(&data)).await
}

/// The fetch that is running or has just ended, if any; cheap, for the page to ask each second while one runs.
#[tauri::command]
fn setup_fetching() -> Option<setup_page::Fetching> {
    setup_page::fetching()
}

/// Runs the command that fetches a missing program, on the person's press: the window names the program, never a command.
#[tauri::command]
async fn setup_fetch(app: tauri::AppHandle, key: String) -> Result<setup_page::Fetching, Failure> {
    let data = data_folder(&app)?;
    blocking(move || setup_page::fetch(&data, &key)).await
}

/// Stops the fetch that is running.
#[tauri::command]
fn setup_stop() {
    setup_page::stop();
}

/// Keeps the person's word that they do or don't need a program the Setup tab lists.
#[tauri::command]
async fn setup_set_aside(app: tauri::AppHandle, key: String, aside: bool) -> Result<setup_page::Setup, Failure> {
    let data = data_folder(&app)?;
    blocking(move || setup_page::set_aside(&data, &key, aside)).await
}

/// A starter's file as it would be written, with the person's values (0.93.0), to show whole before Write. Only reads.
#[tauri::command]
async fn setup_preview_starter(
    game: String,
    repository: String,
    starter: String,
    values: std::collections::BTreeMap<String, String>,
) -> Result<String, Failure> {
    blocking(move || setup_page::preview(&game, &repository, &starter, &values)).await
}

/// Tries an agent for a moment on the person's press (0.90.0): starts it, shakes hands, ends it.
#[tauri::command]
async fn chat_try(app: tauri::AppHandle, agent: String) -> Result<chat_page::Tried, Failure> {
    let data = data_folder(&app)?;
    blocking(move || chat_page::try_agent(&data, &agent)).await
}

/// Writes the chosen starter files into one listed repository, on the person's press after they saw each (0.89.0).
#[tauri::command]
async fn setup_write_starters(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    starters: Vec<String>,
    values: std::collections::BTreeMap<String, std::collections::BTreeMap<String, String>>,
) -> Result<serde_json::Value, Failure> {
    let data = data_folder(&app)?;
    blocking(move || {
        let (setup, refused) = setup_page::write_starters(&data, &game, &repository, &starters, &values)?;
        Ok(serde_json::json!({ "setup": setup, "refused": refused }))
    })
    .await
}

/// Opens the page a program is got from by hand, in the browser: the address the tools name for it.
#[tauri::command]
async fn setup_open_page(key: String) -> Result<(), Failure> {
    blocking(move || setup_page::open_page(&key)).await
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

/// One side of a file that isn't text, which the code viewer listed: its bytes, for the window to draw or play (0.50.0). Only reads.
#[tauri::command]
async fn changed_file(
    game: String,
    repository: String,
    commit: Option<String>,
    path: String,
    side: String,
) -> Result<tauri::ipc::Response, Failure> {
    blocking(move || {
        changed_files::bytes(&game, &repository, commit.as_deref(), &path, &side).map(tauri::ipc::Response::new)
    })
    .await
}

/// Saves one side of a listed file where the person chooses in the Save dialog, on their press (0.50.0).
#[tauri::command]
async fn save_changed_file(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    commit: Option<String>,
    path: String,
    side: String,
    title: String,
) -> Result<Option<String>, Failure> {
    blocking(move || changed_files::save(&app, &game, &repository, commit.as_deref(), &path, &side, &title)).await
}

/// Opens a copy of one side of a listed file with the system's program for its kind, on the person's press (0.50.0).
#[tauri::command]
async fn open_changed_file(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    commit: Option<String>,
    path: String,
    side: String,
) -> Result<String, Failure> {
    let data = data_folder(&app)?;
    blocking(move || changed_files::open(&data, &game, &repository, commit.as_deref(), &path, &side)).await
}

/// A picture or a sound a page listed, raw, for the window to draw or play (0.53.0). Only reads.
#[tauri::command]
async fn viewable_file(path: String) -> Result<tauri::ipc::Response, Failure> {
    blocking(move || viewable::bytes(&path).map(tauri::ipc::Response::new)).await
}

/// Whether this game's tools pair pictures with encoded textures (0.53.0). Only reads.
#[tauri::command]
async fn texture_pairs_offered(game: String) -> Result<bool, Failure> {
    blocking(move || installs_page::has_texture_pairs(&game)).await
}

/// One active mod's pictures beside their encoded textures (0.53.0). Only reads.
#[tauri::command]
async fn texture_pairs(
    game: String,
    name: String,
    on_progress: Channel<kit::Progress>,
) -> Result<serde_json::Value, Failure> {
    blocking(move || installs_page::texture_pairs(&game, &name, Some(&hearing(on_progress)))).await
}

/// A repository's commits a page at a time, for one with no changelog (0.53.0). Only reads.
#[tauri::command]
async fn repository_commits(
    game: String,
    repository: String,
    skip: u32,
    on_progress: Channel<kit::Progress>,
) -> Result<serde_json::Value, Failure> {
    blocking(move || changes_page::commits(&game, &repository, skip, Some(&hearing(on_progress)))).await
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

/// One question about how a repository's code connects: summary, find, around, flow, changed, history, or the names in one C#
/// file (0.79.0, with the commit to read it at). The host checks it first.
#[tauri::command]
async fn connections(
    game: String,
    repository: String,
    kind: String,
    value: Option<String>,
    depth: Option<u8>,
    commit: Option<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<connections_page::Answer, Failure> {
    blocking(move || {
        let question = connections_page::question(&kind, value, depth, commit)?;
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

/// Every setting a game's mods ever added, removed or gave a new default, with the owner's "Looked at" marks.
#[tauri::command]
async fn mod_settings(
    app: tauri::AppHandle,
    game: String,
    on_progress: Channel<kit::Progress>,
) -> Result<Vec<settings_ledger::Ledger>, Failure> {
    let data = data_folder(&app)?;
    blocking(move || settings_ledger::read(&game, &data, Some(&hearing(on_progress)))).await
}

/// Marks settings as looked at, or not, for one repository; the time it was written.
#[tauri::command]
async fn mark_settings(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    ids: Vec<String>,
    seen: bool,
) -> Result<String, Failure> {
    let data = data_folder(&app)?;
    blocking(move || settings_ledger::mark(&game, &repository, &ids, seen, &data)).await
}

/// The folder in the owner's Pictures that every picture of a page goes into.
fn pictures_folder(app: &tauri::AppHandle) -> Result<std::path::PathBuf, Failure> {
    let pictures = app
        .path()
        .picture_dir()
        .or_else(|_| app.path().home_dir().map(|home| home.join("Pictures")))
        .map_err(|problem| Failure::new(FailureCode::WriteFailed, problem.to_string()))?;
    Ok(pictures.join(pictures::FOLDER))
}

/// Saves a picture of a page: its PNG bytes as the request's body, its name (percent-encoded) in the `x-picture-name` header.
/// Returns where it went.
#[tauri::command]
async fn save_picture(app: tauri::AppHandle, request: tauri::ipc::Request<'_>) -> Result<String, Failure> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err(Failure::refused("a picture is sent as its bytes"));
    };
    let name = request
        .headers()
        .get("x-picture-name")
        .and_then(|value| value.to_str().ok())
        .map(pictures::decode_name)
        .unwrap_or_default();
    let bytes = bytes.clone();
    let folder = pictures_folder(&app)?;
    blocking(move || pictures::save(&folder, &name, &bytes).map(|path| path.display().to_string())).await
}

/// The person's home folder, for the window to hide in a report's picture (0.100.0).
#[tauri::command]
fn report_home() -> Option<String> {
    report_page::home()
}

fn report_versions() -> report_page::Versions {
    report_page::Versions {
        companion: env!("CARGO_PKG_VERSION").to_owned(),
        kit: kit::read_status().map(|s| s.kit_version).unwrap_or_else(|_| "unknown".to_owned()),
        system: companion_core::activity::system_name(),
    }
}

/// The GitHub issue a report would open, shown whole before anything leaves (0.100.0). Only reads.
#[tauri::command]
async fn report_preview(words: String, page: String) -> Result<report_page::Report, Failure> {
    blocking(move || {
        report_page::report(&words, &page, &report_versions(), Some("(the picture's name)")).map_err(Failure::refused)
    })
    .await
}

/// Saves the report's picture in the Pictures folder and opens GitHub's new-issue page, filled in, in the browser (0.100.0):
/// on the person's press. The Companion sends nothing; they submit it on GitHub, or don't.
#[tauri::command]
async fn report_open(app: tauri::AppHandle, request: tauri::ipc::Request<'_>) -> Result<String, Failure> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err(Failure::refused("a report's picture is sent as its bytes"));
    };
    let header = |name: &str| {
        request.headers().get(name).and_then(|v| v.to_str().ok()).map(pictures::decode_name).unwrap_or_default()
    };
    let (words, page) = (header("x-report-words"), header("x-report-page"));
    let bytes = bytes.clone();
    let folder = pictures_folder(&app)?;
    blocking(move || {
        let name = format!("Something's off, {page}");
        let draft = report_page::report(&words, &page, &report_versions(), Some(&format!("{name}.png")))
            .map_err(Failure::refused)?;
        let saved = report_page::open(&folder, &draft, &bytes, &name)?;
        Ok(saved)
    })
    .await
}

/// Shows a saved picture in the file manager.
#[tauri::command]
async fn show_picture(app: tauri::AppHandle, path: String) -> Result<(), Failure> {
    let folder = pictures_folder(&app)?;
    blocking(move || pictures::show(&folder, std::path::Path::new(&path))).await
}

/// Saves a screen note ("something's off"): the page's PNG bytes as the request's body, what the window knows of the page as JSON
/// (percent-encoded) in the `x-screen-note` header. The host adds the time and its own version. Returns the note's name.
#[tauri::command]
async fn save_screen_note(app: tauri::AppHandle, request: tauri::ipc::Request<'_>) -> Result<String, Failure> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err(Failure::refused("a note's picture is sent as its bytes"));
    };
    let note: screen_notes::NoteRequest = request
        .headers()
        .get("x-screen-note")
        .and_then(|value| value.to_str().ok())
        .map(pictures::decode_name)
        .and_then(|text| serde_json::from_str(&text).ok())
        .ok_or_else(|| Failure::refused("the note's details did not come with it"))?;
    let bytes = bytes.clone();
    let data = data_folder(&app)?;
    let version = app.package_info().version.to_string();
    blocking(move || screen_notes::save(&data, &note, &version, &bytes, &companion_core::time::now_utc())).await
}

/// The screen notes: open ones newest first, and the newest dealt with.
#[tauri::command]
async fn screen_notes_list(app: tauri::AppHandle) -> Result<screen_notes::Notes, Failure> {
    let data = data_folder(&app)?;
    blocking(move || Ok(screen_notes::list(&data))).await
}

/// Shows a screen note's picture in the file manager.
#[tauri::command]
async fn show_screen_note(app: tauri::AppHandle, id: String) -> Result<(), Failure> {
    let data = data_folder(&app)?;
    blocking(move || screen_notes::show(&data, &id)).await
}

/// What a copy of this program's records would hold, where it goes, and how old the newest copy is.
#[tauri::command]
async fn records_status() -> Result<serde_json::Value, Failure> {
    blocking(records_backup::status).await
}

/// Copies this program's records into a new dated folder, once the owner presses Back up now.
#[tauri::command]
async fn backup_records() -> Result<records_backup::BackupResult, Failure> {
    blocking(records_backup::backup).await
}

/// Each of a game's repositories that lists safe copies: what is copied, changed since, or never copied (0.42.0). Only reads.
#[tauri::command]
async fn safe_copies_status(
    game: String,
    on_progress: Channel<kit::Progress>,
) -> Result<Vec<safe_copies::RepositoryCopies>, Failure> {
    blocking(move || safe_copies::read(&game, Some(&hearing(on_progress)))).await
}

/// Copy now: copies what changed and pushes the repository's copy, once the owner presses it (0.42.0).
#[tauri::command]
async fn safe_copies_copy(
    game: String,
    repository: String,
    list: Option<bool>,
    on_progress: Channel<kit::Progress>,
) -> Result<safe_copies::CopyResult, Failure> {
    let list = list.unwrap_or(false);
    blocking(move || safe_copies::copy_now(&game, &repository, list, Some(&hearing(on_progress)))).await
}

/// Check the copies: hashes every copy again against its record (0.42.0). Only reads.
#[tauri::command]
async fn safe_copies_check(
    game: String,
    repository: String,
    list: Option<bool>,
    on_progress: Channel<kit::Progress>,
) -> Result<safe_copies::CopyResult, Failure> {
    let list = list.unwrap_or(false);
    blocking(move || safe_copies::check(&game, &repository, list, Some(&hearing(on_progress)))).await
}

/// The daily run of every safe copy: whether it is set, when, and how the last went (0.44.0). Only reads.
#[tauri::command]
async fn safe_copies_daily(on_progress: Channel<kit::Progress>) -> Result<safe_copies::CopyResult, Failure> {
    blocking(move || safe_copies::daily(Some(&hearing(on_progress)))).await
}

/// Sets the daily run to the time the owner pressed, or turns it off with no time (0.44.0).
#[tauri::command]
async fn safe_copies_set_daily(
    at: Option<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<safe_copies::CopyResult, Failure> {
    blocking(move || safe_copies::set_daily(at.as_deref(), Some(&hearing(on_progress)))).await
}

/// Restore: copies one set, or one training of it, into a folder the owner picked, once they confirm (0.43.0).
#[tauri::command]
#[allow(clippy::too_many_arguments)]
async fn safe_copies_restore(
    game: String,
    repository: String,
    list: Option<bool>,
    set: String,
    unit: Option<String>,
    to: String,
    overwrite: bool,
    on_progress: Channel<kit::Progress>,
) -> Result<safe_copies::CopyResult, Failure> {
    let list = list.unwrap_or(false);
    blocking(move || {
        safe_copies::restore(
            &game,
            &repository,
            list,
            &set,
            unit.as_deref(),
            &to,
            overwrite,
            Some(&hearing(on_progress)),
        )
    })
    .await
}

/// Let go: removes one copy the tools list as no longer taken, once the owner confirms (0.43.0).
#[tauri::command]
async fn safe_copies_let_go(
    game: String,
    repository: String,
    list: Option<bool>,
    copy: String,
    on_progress: Channel<kit::Progress>,
) -> Result<safe_copies::CopyResult, Failure> {
    let list = list.unwrap_or(false);
    blocking(move || safe_copies::let_go(&game, &repository, list, &copy, Some(&hearing(on_progress)))).await
}

/// Every game Steam has installed, with guesses at each one's data folder and whether the list holds it (0.31.0). Only reads.
#[tauri::command]
async fn steam_games(on_progress: Channel<kit::Progress>) -> Result<games_page::SteamGames, Failure> {
    blocking(move || games_page::steam_games(Some(&hearing(on_progress)))).await
}

/// Adds a game to the owner's list, once they press Add; the list as it was is kept beside it (0.31.0).
#[tauri::command]
async fn add_game(game: companion_core::games::NewGame) -> Result<games_page::Added, Failure> {
    blocking(move || games_page::add(&game)).await
}

/// Starts an empty games list on First steps, with the folder the person's projects are in if they chose one (0.35.0).
#[tauri::command]
async fn start_games_list(root: Option<String>) -> Result<String, Failure> {
    blocking(move || companion_core::games::start(root.as_deref()).map(|path| path.display().to_string())).await
}

/// The last copy the timer made or tried in this run, for Home and the Settings page (0.29.0).
#[tauri::command]
async fn records_automatic() -> Result<Option<records_backup::Automatic>, Failure> {
    Ok(records_backup::last_automatic())
}

/// Windows' own folder or file picker, opened where the current value is. Only answers with the path chosen (0.29.0).
#[tauri::command]
async fn pick_path(
    app: tauri::AppHandle,
    kind: String,
    title: String,
    current: Option<String>,
) -> Result<Option<String>, Failure> {
    let kind = pick::Kind::named(&kind)?;
    blocking(move || pick::pick(&app, kind, &title, current.as_deref())).await
}

/// Who is working on what: the agent sessions' claims board.
#[tauri::command]
async fn claims_list() -> Result<serde_json::Value, Failure> {
    blocking(claims_board::read).await
}

/// The decisions waiting for the owner, in every repository on the list and this program's own.
#[tauri::command]
async fn decisions_list() -> Result<serde_json::Value, Failure> {
    blocking(decisions_page::read).await
}

/// The lines an AI program needs to start the kit's MCP server (0.70.0, Settings → AI). Only reads.
#[tauri::command]
async fn ai_programs_setup() -> Result<serde_json::Value, Failure> {
    blocking(ai_programs::read).await
}

/// AI services for help on pages (0.71.0, Settings → AI): the services, the person's choices, where each key comes from, and the
/// month's count. Only reads.
#[tauri::command]
async fn ai_status(app: tauri::AppHandle) -> Result<companion_core::ai::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || Ok(companion_core::ai::status(&data))).await
}

/// Keeps the person's choice of AI service.
#[tauri::command]
async fn ai_choose_service(app: tauri::AppHandle, service: String) -> Result<companion_core::ai::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || companion_core::ai::choose_service(&data, &service)).await
}

/// Keeps the person's choice of model for one service.
#[tauri::command]
async fn ai_choose_model(
    app: tauri::AppHandle,
    service: String,
    model: String,
) -> Result<companion_core::ai::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || companion_core::ai::choose_model(&data, &service, &model)).await
}

/// Keeps the person's choice of answer length.
#[tauri::command]
async fn ai_choose_length(
    app: tauri::AppHandle,
    length: companion_core::ai::Length,
) -> Result<companion_core::ai::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || companion_core::ai::choose_length(&data, length)).await
}

/// Keeps a key the person typed in the operating system's key store; it never comes back to the window.
#[tauri::command]
async fn ai_keep_key(
    app: tauri::AppHandle,
    service: String,
    key: String,
) -> Result<companion_core::ai::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || companion_core::ai::keep_key(&data, &service, &key)).await
}

/// Forgets a service's kept key.
#[tauri::command]
async fn ai_forget_key(app: tauri::AppHandle, service: String) -> Result<companion_core::ai::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || companion_core::ai::forget_key(&data, &service)).await
}

/// A service's own list of models, on a press, through the same gate as a question.
#[tauri::command]
async fn ai_models(app: tauri::AppHandle, service: String) -> Result<Vec<String>, Failure> {
    let data = data_folder(&app)?;
    blocking(move || companion_core::ai::models(&data, &service)).await
}

/// What Explain this fault would send, built by the host from the fault the Logs page last read; nothing is sent yet.
#[tauri::command]
async fn ai_prepare_fault(app: tauri::AppHandle, game: String, fault: String) -> Result<ai_help::Prepared, Failure> {
    let data = data_folder(&app)?;
    blocking(move || ai_help::prepare_fault(&data, &game, &fault)).await
}

/// What Summarise this version would send, built by the host from the changelogs the Changes page last read (0.72.0).
#[tauri::command]
async fn ai_prepare_version(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    changelog: String,
    version: String,
) -> Result<ai_help::Prepared, Failure> {
    let data = data_folder(&app)?;
    blocking(move || ai_help::prepare_version(&data, &game, &repository, &changelog, &version)).await
}

/// What "What does this mean for my mods?" would send, built from a repository's last update check (0.72.0).
#[tauri::command]
async fn ai_prepare_update_check(
    app: tauri::AppHandle,
    game: String,
    repository: String,
) -> Result<ai_help::Prepared, Failure> {
    let data = data_folder(&app)?;
    blocking(move || ai_help::prepare_update_check(&data, &game, &repository)).await
}

/// Sends the question last prepared, on the person's press, streaming the answer's text and each report the model asks for
/// through the window's channel; it answers, or waits on the person's yes for a report an online model asked for (0.73.0).
#[tauri::command]
async fn ai_send(app: tauri::AppHandle, id: u64, on_event: Channel<ai_help::Event>) -> Result<ai_help::Step, Failure> {
    let data = data_folder(&app)?;
    blocking(move || ai_help::send(&data, id, &mut |event| drop(on_event.send(event)))).await
}

/// The person's yes or no to the report an online model asked for, shown whole first (0.73.0); the question then goes on.
#[tauri::command]
async fn ai_answer_call(
    app: tauri::AppHandle,
    id: u64,
    allow: bool,
    on_event: Channel<ai_help::Event>,
) -> Result<ai_help::Step, Failure> {
    let data = data_folder(&app)?;
    blocking(move || ai_help::answer_call(&data, id, allow, &mut |event| drop(on_event.send(event)))).await
}

/// Keeps whether the model may ask the tool kit's reports while it answers (0.73.0).
#[tauri::command]
async fn ai_choose_tools(app: tauri::AppHandle, on: bool) -> Result<companion_core::ai::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || companion_core::ai::choose_tools(&data, on)).await
}

/// The Chat page's switch, the agents with whether each is on this computer, and the one running (0.74.0). Only reads.
#[tauri::command]
async fn chat_status(app: tauri::AppHandle) -> Result<chat_page::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || Ok(chat_page::status(&data))).await
}

/// Switches the Chat page on or off; off also ends an agent that is running.
#[tauri::command]
async fn chat_switch(app: tauri::AppHandle, on: bool) -> Result<chat_page::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || chat_page::switch(&data, on)).await
}

/// Keeps the chosen agent.
#[tauri::command]
async fn chat_choose(app: tauri::AppHandle, agent: String) -> Result<chat_page::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || chat_page::choose(&data, &agent)).await
}

/// Keeps how the agent's commands are handled (0.84.0): refused, ask or automatic.
#[tauri::command]
async fn chat_commands(app: tauri::AppHandle, mode: String) -> Result<chat_page::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || chat_page::choose_commands(&data, &mode)).await
}

/// The person's answer to a command the agent asked to run through the Companion (0.84.0): run, no or for-chat.
#[tauri::command]
async fn chat_command(request: String, answer: String) -> Result<(), Failure> {
    blocking(move || chat_page::answer_command(&request, &answer)).await
}

/// The person allows the command a permission question names for the rest of this chat (0.84.0).
#[tauri::command]
async fn chat_allow_for_chat(request: String) -> Result<(), Failure> {
    blocking(move || chat_page::allow_for_chat(&request)).await
}

/// Starts the chosen agent in a repository of the game, on the person's press; what it says comes through the channel.
#[tauri::command]
async fn chat_start(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    on_event: Channel<companion_core::acp::Event>,
) -> Result<chat_page::Started, Failure> {
    let data = data_folder(&app)?;
    let hear: companion_core::acp::OnEvent = std::sync::Arc::new(move |event| drop(on_event.send(event)));
    blocking(move || chat_page::start(&data, &game, &repository, hear)).await
}

/// One message from the person; answers when the agent's turn ends, with why it ended.
#[tauri::command]
async fn chat_prompt(text: String) -> Result<String, Failure> {
    blocking(move || chat_page::prompt(&text)).await
}

/// Asks the agent to stop its turn.
#[tauri::command]
async fn chat_cancel() -> Result<(), Failure> {
    blocking(chat_page::cancel).await
}

/// The person's answer to a permission the agent asked: one of the options it offered, or none.
#[tauri::command]
async fn chat_permission(request: String, option: Option<String>) -> Result<(), Failure> {
    blocking(move || chat_page::answer_permission(&request, option.as_deref())).await
}

/// The person's answer to a change the agent asked to make through the Companion, shown whole first (0.75.0).
#[tauri::command]
async fn chat_write(request: String, allow: bool) -> Result<(), Failure> {
    blocking(move || chat_page::answer_write(&request, allow)).await
}

/// Ends the agent running, with every process it started.
#[tauri::command]
async fn chat_end() -> Result<(), Failure> {
    blocking(chat_page::end).await
}

/// Records the owner's answer to one decision, once they press Decide.
#[tauri::command]
async fn answer_decision(
    repository: String,
    id: String,
    option: String,
    words: String,
) -> Result<decisions_page::AnswerResult, Failure> {
    blocking(move || decisions_page::answer(&repository, &id, &option, &words)).await
}

/// The pictures and sounds waiting for the owner's pick, in every repository that keeps a picks file (0.55.0). Only reads.
#[tauri::command]
async fn picks_list() -> Result<serde_json::Value, Failure> {
    blocking(picks_page::read).await
}

/// Records the owner's pick, a try or none, once they press it (0.55.0).
#[tauri::command]
async fn answer_pick(
    repository: String,
    id: String,
    pick: String,
    words: String,
) -> Result<picks_page::PickResult, Failure> {
    blocking(move || picks_page::answer(&repository, &id, &pick, &words)).await
}

/// Every repository of the game that keeps a Workshop catalogue, with its status and what waits (0.69.0). Only reads.
#[tauri::command]
async fn publish_read(app: tauri::AppHandle, game: String) -> Result<serde_json::Value, Failure> {
    let data = data_folder(&app)?;
    blocking(move || publish_page::read(&game, &data)).await
}

/// How many versions wait for an upload across the game's repositories, for Home's note (0.69.0). Only reads.
#[tauri::command]
async fn publish_waiting(game: String) -> Result<serde_json::Value, Failure> {
    blocking(move || publish_page::waiting(&game)).await
}

/// One mod's card: the change note Steam would get, tags, Required items, receipts (0.69.0). Only reads.
#[tauri::command]
async fn publish_show(game: String, repository: String, mod_name: String) -> Result<serde_json::Value, Failure> {
    blocking(move || publish_page::show(&game, &repository, &mod_name)).await
}

/// A mod's Workshop page as text, with every problem (0.69.0). Only reads.
#[tauri::command]
async fn publish_page_text(game: String, repository: String, mod_name: String) -> Result<serde_json::Value, Failure> {
    blocking(move || publish_page::page(&game, &repository, &mod_name)).await
}

/// Checks a page's text without writing anything (0.69.0).
#[tauri::command]
async fn publish_check_page(
    game: String,
    repository: String,
    mod_name: String,
    text: String,
) -> Result<serde_json::Value, Failure> {
    blocking(move || publish_page::check_page(&game, &repository, &mod_name, &text)).await
}

/// Saves a page's text on the owner's press; the kit refuses one with problems (0.69.0).
#[tauri::command]
async fn publish_save_page(
    game: String,
    repository: String,
    mod_name: String,
    text: String,
) -> Result<publish_page::PressResult, Failure> {
    blocking(move || publish_page::save_page(&game, &repository, &mod_name, &text)).await
}

/// Writes a mod's release notes and stages a checked candidate, offline, on the owner's press (0.69.0).
#[tauri::command]
async fn publish_prepare(
    game: String,
    repository: String,
    mod_name: String,
    build: bool,
    on_progress: Channel<kit::Progress>,
) -> Result<publish_page::PressResult, Failure> {
    blocking(move || publish_page::prepare(&game, &repository, &mod_name, build, Some(&hearing(on_progress)))).await
}

/// Sends a mod to the Workshop, only on the owner's press and their yes, while the setting is on (0.69.0).
#[tauri::command]
async fn publish_upload(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    mod_name: String,
    kind: String,
    via: String,
    on_progress: Channel<kit::Progress>,
) -> Result<publish_page::PressResult, Failure> {
    let data = data_folder(&app)?;
    blocking(move || {
        publish_page::upload(&game, &repository, &mod_name, &kind, &via, &data, Some(&hearing(on_progress)))
    })
    .await
}

/// Updates every item with a newer version, on the owner's press and their yes, while the setting is on (0.69.0).
#[tauri::command]
async fn publish_update_all(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    via: String,
    on_progress: Channel<kit::Progress>,
) -> Result<publish_page::PressResult, Failure> {
    let data = data_folder(&app)?;
    blocking(move || publish_page::update_all(&game, &repository, &via, &data, Some(&hearing(on_progress)))).await
}

/// Reads each item back from Steam's public pages and writes what they show, on the owner's press (0.69.0).
#[tauri::command]
async fn publish_pull(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    on_progress: Channel<kit::Progress>,
) -> Result<publish_page::PressResult, Failure> {
    let data = data_folder(&app)?;
    blocking(move || publish_page::pull(&game, &repository, &data, Some(&hearing(on_progress)))).await
}

/// Opens an item the last card named in the Steam client (0.69.0).
#[tauri::command]
async fn publish_open_in_steam(number: String) -> Result<(), Failure> {
    blocking(move || publish_page::open_in_steam(&number)).await
}

/// Whether the owner lets this program upload to the Workshop (0.69.0; on by default).
#[tauri::command]
async fn publish_uploads_setting(app: tauri::AppHandle) -> Result<bool, Failure> {
    let data = data_folder(&app)?;
    blocking(move || Ok(publish_page::uploads_on(&data))).await
}

/// Keeps the owner's Workshop uploads setting (0.69.0).
#[tauri::command]
async fn publish_choose_uploads(app: tauri::AppHandle, on: bool) -> Result<bool, Failure> {
    let data = data_folder(&app)?;
    blocking(move || publish_page::choose_uploads(&data, on)).await
}

/// What a game writes and what Steam records about it: what changed since the last launch, saves, screenshots and space.
#[tauri::command]
async fn game_files(game: String, since: Option<String>) -> Result<serde_json::Value, Failure> {
    blocking(move || game_files_page::read(&game, since)).await
}

/// Shows a save or a screenshot the Game files page listed, in the file manager.
#[tauri::command]
async fn show_game_file(path: String) -> Result<(), Failure> {
    blocking(move || game_files_page::show(&path)).await
}

/// One game's screenshots alone, for the Timeline's gallery (0.32.0). Only reads.
#[tauri::command]
async fn game_screenshots(game: String) -> Result<serde_json::Value, Failure> {
    blocking(move || game_files_page::screenshots(&game)).await
}

/// Every theme on offer and the one in use (0.33.0). Only reads.
#[tauri::command]
async fn theme_status(app: tauri::AppHandle) -> Result<companion_core::themes::Status, Failure> {
    let folder = themes_page::folder(&data_folder(&app)?);
    blocking(move || Ok(companion_core::themes::status(&folder))).await
}

/// Whether features for AI agent sessions are shown (0.37.0): the person's choice, and what on this PC shows sessions at work.
#[tauri::command]
async fn agent_features(app: tauri::AppHandle) -> Result<companion_core::agents::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || {
        let repositories = companion_core::games::listed_repository_paths().unwrap_or_default();
        Ok(companion_core::agents::status(&data, &repositories))
    })
    .await
}

/// Keeps the person's choice of when features for agent sessions show: found, on or off.
#[tauri::command]
async fn choose_agent_features(
    app: tauri::AppHandle,
    choice: String,
) -> Result<companion_core::agents::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || {
        let repositories = companion_core::games::listed_repository_paths().unwrap_or_default();
        companion_core::agents::choose(&data, &choice, &repositories)
    })
    .await
}

/// Ours, theirs or unknown for each mod the Logs page names, with its repository on GitHub (0.65.0, report links).
#[tauri::command]
async fn report_places(game: String, mods: Vec<String>) -> Result<serde_json::Value, Failure> {
    blocking(move || report_links::places(&game, mods)).await
}

/// Opens one of our own repositories' new-issue form, filled in; a text too long for an address comes back for the clipboard.
#[tauri::command]
async fn report_ours(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    title: String,
    body: String,
) -> Result<serde_json::Value, Failure> {
    let data = data_folder(&app)?;
    blocking(move || report_links::report_ours(&data, &game, &repository, &title, &body)).await
}

/// Opens another author's blank new-issue form.
#[tauri::command]
async fn report_their_form(game: String, repository: String) -> Result<(), Failure> {
    blocking(move || report_links::their_form(&game, &repository)).await
}

/// Opens one issue of a repository the Logs page named.
#[tauri::command]
async fn report_open_issue(game: String, repository: String, number: u64) -> Result<(), Failure> {
    blocking(move || report_links::open_issue(&game, &repository, number)).await
}

/// Another author's issues, those naming the fault's words first, on a press, while Their reports is on.
#[tauri::command]
async fn report_theirs(
    app: tauri::AppHandle,
    game: String,
    repository: String,
    words: String,
) -> Result<serde_json::Value, Failure> {
    let data = data_folder(&app)?;
    blocking(move || report_links::their_reports(&data, &game, &repository, &words)).await
}

/// What the nightly watch found in the public source of mods a game's repositories patch, while the switch is on (0.63.0).
#[tauri::command]
async fn nightly_watch(
    app: tauri::AppHandle,
    game: String,
    on_progress: Channel<kit::Progress>,
) -> Result<serde_json::Value, Failure> {
    let data = data_folder(&app)?;
    blocking(move || nightly::read(&data, &game, Some(&hearing(on_progress)))).await
}

/// Which kinds of online call the program may make by itself, each with what it contacts (0.61.0, `docs/online.md`).
#[tauri::command]
async fn online_status(app: tauri::AppHandle) -> Result<companion_core::online::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || Ok(companion_core::online::status(&data))).await
}

/// Keeps the person's choice for one kind of online call: on or off.
#[tauri::command]
async fn choose_online(
    app: tauri::AppHandle,
    kind: String,
    on: bool,
) -> Result<companion_core::online::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || companion_core::online::choose(&data, &kind, on)).await
}

/// Home's gate lights: each of a game's repositories with its remote, and GitHub's checks while the switch is on. `pressed` is
/// Look now; Home's own look is automatic (0.61.0).
#[tauri::command]
async fn repo_status(
    app: tauri::AppHandle,
    game: String,
    pressed: bool,
    on_progress: Channel<kit::Progress>,
) -> Result<serde_json::Value, Failure> {
    let data = data_folder(&app)?;
    blocking(move || repo_status::read(&data, &game, pressed, Some(&hearing(on_progress)))).await
}

/// Uses a theme on offer from now on, on the owner's press.
#[tauri::command]
async fn choose_theme(app: tauri::AppHandle, id: String) -> Result<companion_core::themes::Status, Failure> {
    let folder = themes_page::folder(&data_folder(&app)?);
    blocking(move || companion_core::themes::choose(&folder, &id)).await
}

/// Brings in a theme file the owner chooses in Windows' Open dialog; checked, kept and used.
#[tauri::command]
async fn import_theme(app: tauri::AppHandle, title: String) -> Result<themes_page::Moved, Failure> {
    let data = data_folder(&app)?;
    blocking(move || themes_page::import(&app, &data, &title)).await
}

/// Saves a theme on offer where the owner chooses in Windows' Save dialog.
#[tauri::command]
async fn export_theme(app: tauri::AppHandle, id: String, title: String) -> Result<themes_page::Moved, Failure> {
    let data = data_folder(&app)?;
    blocking(move || themes_page::export(&app, &data, &id, &title)).await
}

/// Takes away a theme of the owner's, on their press; the program's own stay.
#[tauri::command]
async fn remove_theme(app: tauri::AppHandle, id: String) -> Result<companion_core::themes::Status, Failure> {
    let folder = themes_page::folder(&data_folder(&app)?);
    blocking(move || companion_core::themes::remove(&folder, &id)).await
}

/// Keeps a theme the owner made, and uses it, once every check passes.
#[tauri::command]
async fn keep_theme(app: tauri::AppHandle, text: String) -> Result<companion_core::themes::Status, Failure> {
    let folder = themes_page::folder(&data_folder(&app)?);
    blocking(move || companion_core::themes::keep(&folder, &text)).await
}

/// Saves a theme being made where the owner chooses, before every check passes.
#[tauri::command]
async fn export_theme_draft(app: tauri::AppHandle, text: String, title: String) -> Result<themes_page::Moved, Failure> {
    let data = data_folder(&app)?;
    blocking(move || themes_page::export_draft(&app, &data, &text, &title)).await
}

/// Code colours from VS Code (0.77.0): every set kept, and the one in use made readable on the theme in use. Only reads.
#[tauri::command]
async fn code_colours_status(app: tauri::AppHandle) -> Result<companion_core::code_colours::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || Ok(code_colours_page::status(&data))).await
}

/// Uses a kept set of code colours from now on, or the theme's own ("theme").
#[tauri::command]
async fn choose_code_colours(
    app: tauri::AppHandle,
    id: String,
) -> Result<companion_core::code_colours::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || code_colours_page::choose(&data, &id)).await
}

/// Takes away a kept set of code colours, on the person's second press.
#[tauri::command]
async fn remove_code_colours(
    app: tauri::AppHandle,
    id: String,
) -> Result<companion_core::code_colours::Status, Failure> {
    let data = data_folder(&app)?;
    blocking(move || code_colours_page::remove(&data, &id)).await
}

/// The colour themes VS Code and the editors built from it have on this computer. Only reads.
#[tauri::command]
async fn vscode_themes() -> Result<Vec<companion_core::code_colours::Installed>, Failure> {
    blocking(move || Ok(code_colours_page::installed())).await
}

/// Brings in one installed VS Code theme the last listing named, checked against a fresh listing; kept and used.
#[tauri::command]
async fn bring_in_vscode_theme(app: tauri::AppHandle, file: String) -> Result<code_colours_page::Moved, Failure> {
    let data = data_folder(&app)?;
    blocking(move || code_colours_page::bring_in_installed(&data, &file)).await
}

/// Brings in a VS Code theme file the person chooses in Windows' Open dialog; kept and used.
#[tauri::command]
async fn bring_in_code_colours_file(app: tauri::AppHandle, title: String) -> Result<code_colours_page::Moved, Failure> {
    let data = data_folder(&app)?;
    blocking(move || code_colours_page::bring_in_file(&app, &data, &title)).await
}

/// One listed screenshot's bytes, raw, for the window to draw small or whole (0.32.0).
#[tauri::command]
async fn screenshot(path: String) -> Result<tauri::ipc::Response, Failure> {
    blocking(move || game_files_page::shot(&path).map(tauri::ipc::Response::new)).await
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

/// The game's memory watch as it stands: the running one, else the newest or the one named; says when the game has none.
#[tauri::command]
async fn memory_status(
    game: String,
    watch: Option<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<memory_page::MemoryReading, Failure> {
    blocking(move || memory_page::status(&game, watch.as_deref(), Some(&hearing(on_progress)))).await
}

/// A kept memory watch's whole report.
#[tauri::command]
async fn memory_report(
    game: String,
    watch: String,
    on_progress: Channel<kit::Progress>,
) -> Result<memory_page::MemoryReading, Failure> {
    blocking(move || memory_page::report(&game, &watch, Some(&hearing(on_progress)))).await
}

/// Starts a memory watch on the owner's press and confirmation; answers with its report when it ends.
#[tauri::command]
async fn memory_start(
    game: String,
    minutes: u32,
    counters: bool,
    label: String,
    on_progress: Channel<kit::Progress>,
) -> Result<memory_page::MemoryReading, Failure> {
    blocking(move || memory_page::start(&game, minutes, counters, &label, Some(&hearing(on_progress)))).await
}

/// Asks the running memory watch to end early.
#[tauri::command]
async fn memory_stop(game: String, watch: Option<String>) -> Result<memory_page::StepResult, Failure> {
    blocking(move || memory_page::stop(&game, watch.as_deref())).await
}

/// Takes the key that marks a game's running watch from the game itself (0.98.0); a press is told through the channel.
#[tauri::command]
fn memory_take_game_key(
    app: tauri::AppHandle,
    game: String,
    key: String,
    words: String,
    on_marked: Channel<game_key::Marked>,
) -> Result<(), Failure> {
    game_key::take(&app, &game, &key, &words, on_marked)
}

/// Lets go of that key (0.98.0).
#[tauri::command]
fn memory_release_game_key(app: tauri::AppHandle) {
    game_key::release(&app);
}

/// Puts the owner's words beside a memory watch's figures.
#[tauri::command]
async fn memory_mark(
    game: String,
    watch: Option<String>,
    text: String,
    at: Option<f64>,
) -> Result<memory_page::StepResult, Failure> {
    blocking(move || memory_page::mark(&game, watch.as_deref(), &text, at)).await
}

/// Whether this game's tools can look inside the running game; says so before anything is pressed. Only reads the manifest.
#[tauri::command]
async fn explorer_offer(game: String) -> Result<explorer_page::Offer, Failure> {
    blocking(move || explorer_page::offer(&game)).await
}

/// Takes a snapshot of the running game and holds it, on the person's press and confirmation; any held one is let go first.
#[tauri::command]
async fn explorer_start(
    game: String,
    label: String,
    on_progress: Channel<kit::Progress>,
) -> Result<explorer_page::Taken, Failure> {
    blocking(move || explorer_page::start(&game, &label, Some(&hearing(on_progress)))).await
}

/// Asks the held snapshot one question the host has checked; says when the snapshot named is no longer held.
#[tauri::command]
async fn explorer_ask(
    snapshot: u64,
    request: serde_json::Value,
    on_progress: Channel<kit::Progress>,
) -> Result<explorer_page::Answer, Failure> {
    blocking(move || explorer_page::ask(snapshot, &request, Some(&hearing(on_progress)))).await
}

/// Runs the live checks with the game frozen (0.102.0), on the person's press and confirmation: no snapshot is taken or held.
#[tauri::command]
async fn explorer_frozen_checks(
    game: String,
    on_progress: Channel<kit::Progress>,
) -> Result<explorer_page::FrozenChecks, Failure> {
    blocking(move || explorer_page::frozen_checks(&game, Some(&hearing(on_progress)))).await
}

/// Answers one question with the game frozen (0.103.0): the overview, one kind's first page or the checks, each one frozen read.
#[tauri::command]
async fn explorer_frozen_ask(
    game: String,
    request: serde_json::Value,
    on_progress: Channel<kit::Progress>,
) -> Result<explorer_page::Answer, Failure> {
    blocking(move || explorer_page::frozen_ask(&game, &request, Some(&hearing(on_progress)))).await
}

/// Lets the held snapshot go: on Let it go, and when the page closes. True when one was held.
#[tauri::command]
async fn explorer_release(snapshot: Option<u64>) -> Result<bool, Failure> {
    blocking(move || Ok(explorer_page::release(snapshot))).await
}

/// Another author's code on the Code map: a name's source (`show`) or the assembly declaring it (`holder`). Only reads.
#[tauri::command]
async fn their_code(
    game: String,
    repository: String,
    kind: String,
    name: String,
    on_progress: Channel<kit::Progress>,
) -> Result<other_code_page::Answer, Failure> {
    blocking(move || other_code_page::their_code(&game, &repository, &kind, &name, Some(&hearing(on_progress)))).await
}

/// Decompiles an assembly the tools named as holding the code, on the owner's press, into the kit's cache.
#[tauri::command]
async fn decompile_assembly(
    game: String,
    repository: String,
    assembly: String,
    on_progress: Channel<kit::Progress>,
) -> Result<other_code_page::Answer, Failure> {
    blocking(move || other_code_page::decompile(&game, &repository, &assembly, Some(&hearing(on_progress)))).await
}

/// Keeps the new builds of the game and the mods a repository ties into, on the owner's press (0.28.0).
#[tauri::command]
async fn keep_builds(
    game: String,
    repository: String,
    on_progress: Channel<kit::Progress>,
) -> Result<other_code_page::Answer, Failure> {
    blocking(move || other_code_page::keep_builds(&game, &repository, Some(&hearing(on_progress)))).await
}

/// Marks a temporary patch's update as read, or takes the mark back, for a row this run's update check asked about (0.104.0).
#[tauri::command]
async fn mark_update_read(
    game: String,
    repository: String,
    row: String,
    build: String,
    clear: bool,
) -> Result<other_code_page::Answer, Failure> {
    blocking(move || other_code_page::mark_read(&game, &repository, &row, &build, clear)).await
}

/// What the updates mean for a repository's code: our targets, temporary patches, update sizes, our XML patches (0.35.0).
#[tauri::command]
async fn update_check(
    game: String,
    repository: String,
    since: Option<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<other_code_page::Answer, Failure> {
    blocking(move || other_code_page::update_check(&game, &repository, since.as_deref(), Some(&hearing(on_progress))))
        .await
}

/// The builds the tools have kept, or what changed in one file's last update (and in one member of it).
#[tauri::command]
async fn updates(
    game: String,
    file: Option<String>,
    owner: Option<String>,
    member: Option<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<other_code_page::Answer, Failure> {
    blocking(move || {
        other_code_page::updates(
            &game,
            file.as_deref(),
            owner.as_deref(),
            member.as_deref(),
            Some(&hearing(on_progress)),
        )
    })
    .await
}

/// A game's mod list check: what is wrong with each list of active mods and why (0.45.0). Reads; with `online`, asks Steam's
/// public Workshop API too.
#[tauri::command]
async fn mod_list_check(
    app: tauri::AppHandle,
    game: String,
    online: bool,
    on_progress: Channel<kit::Progress>,
) -> Result<serde_json::Value, Failure> {
    let data = data_folder(&app)?;
    blocking(move || mod_list_page::read(&data, &game, online, Some(&hearing(on_progress)))).await
}

/// One change the last check offered, after the owner's yes; the kit keeps a backup of the list first (0.45.0).
#[tauri::command]
async fn mod_list_change(
    game: String,
    list: String,
    action: String,
    id: String,
    on_progress: Channel<kit::Progress>,
) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_page::change(&game, &list, &action, &id, Some(&hearing(on_progress)))).await
}

/// Puts a list back as it was before the latest change the tools made to it (0.45.0).
#[tauri::command]
async fn mod_list_undo(
    game: String,
    list: String,
    on_progress: Channel<kit::Progress>,
) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_page::undo(&game, &list, Some(&hearing(on_progress)))).await
}

/// Every mod on this PC and each list in order, for Edit the list (0.46.0). Only reads.
#[tauri::command]
async fn mod_list_mods(game: String, on_progress: Channel<kit::Progress>) -> Result<serde_json::Value, Failure> {
    blocking(move || mod_list_page::mods(&game, Some(&hearing(on_progress)))).await
}

/// A list sorted from every rule, each move explained; written only on Use this order (0.47.0).
#[tauri::command]
async fn mod_list_sort(
    game: String,
    list: String,
    full: bool,
    apply: bool,
    on_progress: Channel<kit::Progress>,
) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_page::sort(&game, &list, full, apply, Some(&hearing(on_progress)))).await
}

/// The owner's load-order rules and every rule set the sorter reads (0.47.0). Only reads.
#[tauri::command]
async fn mod_list_rules(game: String, on_progress: Channel<kit::Progress>) -> Result<serde_json::Value, Failure> {
    blocking(move || mod_list_page::rules(&game, Some(&hearing(on_progress)))).await
}

/// The community lists the sorter and the check read, and how old; with `fetch`, fetched first (0.112.0). The fetch goes online.
#[tauri::command]
async fn mod_list_databases(
    app: tauri::AppHandle,
    game: String,
    fetch: bool,
    stale: bool,
    on_progress: Channel<kit::Progress>,
) -> Result<serde_json::Value, Failure> {
    let data = data_folder(&app)?;
    blocking(move || mod_list_databases::databases(&data, &game, fetch, stale, Some(&hearing(on_progress)))).await
}

/// Brings the owner's RimSort rules into their own (0.112.0), on a press.
#[tauri::command]
async fn mod_list_import_rules(game: String) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_databases::import_rules(&game)).await
}

/// Keeps one of the owner's load-order rules (0.47.0).
#[tauri::command]
async fn mod_list_add_rule(
    game: String,
    id: String,
    kind: String,
    other: String,
) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_page::add_rule(&game, &id, &kind, &other)).await
}

/// Takes away one of the owner's load-order rules, by its number (0.47.0).
#[tauri::command]
async fn mod_list_drop_rule(game: String, number: u32) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_page::drop_rule(&game, number)).await
}

/// Every saved list of a game's mods, by source (0.48.0). Only reads.
#[tauri::command]
async fn mod_list_lists(game: String, on_progress: Channel<kit::Progress>) -> Result<serde_json::Value, Failure> {
    blocking(move || mod_list_lists::lists(&game, Some(&hearing(on_progress)))).await
}

/// What loading a saved list would change; with `apply` (the owner's press of Use this list), loads it after a backup (0.48.0).
#[tauri::command]
async fn mod_list_compare(
    game: String,
    list: String,
    source: String,
    reference: String,
    apply: bool,
    on_progress: Channel<kit::Progress>,
) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_lists::compare(&game, &list, &source, &reference, apply, Some(&hearing(on_progress))))
        .await
}

/// The Open dialog for a mod list file (0.48.0).
#[tauri::command]
async fn mod_list_open_file(app: tauri::AppHandle, game: String, title: String) -> Result<Option<String>, Failure> {
    blocking(move || mod_list_lists::open_file(&app, &game, &title)).await
}

/// Keeps the game's list as it stands, by name (0.48.0).
#[tauri::command]
async fn mod_list_save(
    game: String,
    list: String,
    name: String,
    replace: bool,
) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_lists::save(&game, &list, &name, replace)).await
}

/// Takes away a list saved by name (0.48.0).
#[tauri::command]
async fn mod_list_forget(game: String, reference: String) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_lists::forget(&game, &reference)).await
}

/// Writes a list as the game's own list file, where the owner chooses in the Save dialog (0.48.0).
#[tauri::command]
async fn mod_list_export(
    app: tauri::AppHandle,
    game: String,
    list: String,
    source: Option<String>,
    reference: Option<String>,
    label: String,
    title: String,
) -> Result<Option<mod_list_page::ChangeResult>, Failure> {
    let chosen = source.zip(reference);
    blocking(move || mod_list_lists::export(&app, &game, &list, chosen, &label, &title)).await
}

/// Opens the Steam client's Workshop search for a missing mod's name (0.48.0).
#[tauri::command]
async fn mod_list_find_on_workshop(game: String, name: String) -> Result<(), Failure> {
    blocking(move || mod_list_lists::find_on_workshop(&game, &name)).await
}

/// Subscribes to Workshop items through the running Steam client; with `wait`, answers once Steam has downloaded them (0.49.0).
#[tauri::command]
async fn mod_list_subscribe(
    game: String,
    numbers: Vec<String>,
    wait: bool,
    on_progress: Channel<kit::Progress>,
) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_steam::subscribe(&game, &numbers, wait, Some(&hearing(on_progress)))).await
}

/// Switches Workshop mods off, then unsubscribes through Steam, after the owner's yes (0.49.0).
#[tauri::command]
async fn mod_list_unsubscribe(
    game: String,
    list: String,
    numbers: Vec<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_steam::unsubscribe(&game, &list, &numbers, Some(&hearing(on_progress)))).await
}

/// Opens a mod's Workshop page in the Steam client: only a number a check named (0.45.0).
#[tauri::command]
async fn mod_list_open_in_steam(number: String) -> Result<(), Failure> {
    blocking(move || mod_list_page::open_in_steam(&number)).await
}

/// Saves the rebuilt Edit the list's draft whole, on the owner's press (0.108.0).
#[tauri::command]
async fn mod_list_write(
    game: String,
    list: String,
    ids: Vec<String>,
    was: Vec<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_page::write(&game, &list, &ids, &was, Some(&hearing(on_progress)))).await
}

/// What players say about a mod on its Workshop page, read on the owner's press (0.107.0). Only reads, keyless.
#[tauri::command]
async fn players_say(
    app: tauri::AppHandle,
    number: String,
    on_progress: Channel<kit::Progress>,
) -> Result<kit::Answer, Failure> {
    let data = data_folder(&app)?;
    blocking(move || mod_list_steam::players_say(&data, &number, Some(&hearing(on_progress)))).await
}

/// What players say about the game or one of its DLCs on Steam, read on the owner's press (0.111.0). Only reads, keyless.
#[tauri::command]
async fn game_reviews(
    app: tauri::AppHandle,
    game: String,
    name: String,
    on_progress: Channel<kit::Progress>,
) -> Result<kit::Answer, Failure> {
    let data = data_folder(&app)?;
    blocking(move || mod_list_steam::game_reviews(&data, &game, &name, Some(&hearing(on_progress)))).await
}

/// One definition looked up by name: who defines it, as written, or as patched (0.106.0). Only reads.
#[tauri::command]
async fn look_up(
    game: String,
    kind: String,
    name: String,
    on_progress: Channel<kit::Progress>,
) -> Result<kit::Answer, Failure> {
    blocking(move || lookup::look_up(&game, &kind, &name, Some(&hearing(on_progress)))).await
}

/// The crash dumps kept and whether a look for zero-filled files is due, for Home (0.105.0). Only reads.
#[tauri::command]
async fn crash_status() -> Result<crash_look::Status, Failure> {
    blocking(crash_look::status).await
}

/// Looks for files a crash left filled with zeros, by itself, only when a look is due (0.105.0). Only reads.
#[tauri::command]
async fn crash_look_now(on_progress: Channel<kit::Progress>) -> Result<crash_look::Look, Failure> {
    blocking(move || crash_look::look(Some(&hearing(on_progress)))).await
}

/// What the tools, builds and tests left behind, by group. Only reads.
#[tauri::command]
async fn cleanup_list(on_progress: Channel<kit::Progress>) -> Result<cleanup_page::Listing, Failure> {
    blocking(move || cleanup_page::list(Some(&hearing(on_progress)))).await
}

/// Deletes the groups the owner chose, after their press and confirmation.
#[tauri::command]
async fn cleanup_apply(
    groups: Vec<String>,
    on_progress: Channel<kit::Progress>,
) -> Result<cleanup_page::Listing, Failure> {
    blocking(move || cleanup_page::apply(&groups, Some(&hearing(on_progress)))).await
}

/// Starts the program.
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            about,
            activity,
            updates_status,
            updates_check,
            updates_install,
            setup_status,
            setup_look_again,
            setup_fetching,
            setup_fetch,
            setup_stop,
            setup_set_aside,
            setup_open_page,
            setup_write_starters,
            setup_preview_starter,
            chat_try,
            cleanup_list,
            crash_status,
            look_up,
            players_say,
            game_reviews,
            mod_list_write,
            crash_look_now,
            cleanup_apply,
            mod_list_check,
            mod_list_change,
            mod_list_undo,
            mod_list_open_in_steam,
            mod_list_mods,
            mod_list_sort,
            mod_list_rules,
            mod_list_add_rule,
            mod_list_databases,
            mod_list_import_rules,
            mod_list_drop_rule,
            mod_list_lists,
            mod_list_compare,
            mod_list_open_file,
            mod_list_save,
            mod_list_forget,
            mod_list_export,
            mod_list_find_on_workshop,
            mod_list_subscribe,
            mod_list_unsubscribe,
            their_code,
            decompile_assembly,
            updates,
            keep_builds,
            update_check,
            mark_update_read,
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
            changed_file,
            viewable_file,
            texture_pairs_offered,
            texture_pairs,
            repository_commits,
            save_changed_file,
            open_changed_file,
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
            mod_settings,
            mark_settings,
            save_picture,
            show_picture,
            save_screen_note,
            screen_notes_list,
            show_screen_note,
            records_status,
            backup_records,
            safe_copies_status,
            safe_copies_copy,
            safe_copies_check,
            safe_copies_restore,
            safe_copies_let_go,
            safe_copies_daily,
            safe_copies_set_daily,
            claims_list,
            decisions_list,
            ai_programs_setup,
            ai_status,
            ai_choose_service,
            ai_choose_model,
            ai_choose_length,
            ai_keep_key,
            ai_forget_key,
            ai_models,
            ai_prepare_fault,
            ai_prepare_version,
            ai_prepare_update_check,
            ai_send,
            ai_answer_call,
            ai_choose_tools,
            chat_status,
            chat_switch,
            chat_choose,
            chat_start,
            chat_prompt,
            chat_cancel,
            chat_permission,
            chat_write,
            chat_commands,
            chat_command,
            chat_allow_for_chat,
            chat_end,
            picks_list,
            publish_read,
            publish_waiting,
            publish_show,
            publish_page_text,
            publish_check_page,
            publish_save_page,
            publish_prepare,
            publish_upload,
            publish_update_all,
            publish_pull,
            publish_open_in_steam,
            publish_uploads_setting,
            publish_choose_uploads,
            answer_pick,
            answer_decision,
            game_files,
            show_game_file,
            memory_status,
            memory_report,
            memory_start,
            memory_stop,
            memory_mark,
            memory_take_game_key,
            report_home,
            report_preview,
            report_open,
            memory_release_game_key,
            explorer_offer,
            explorer_start,
            explorer_ask,
            explorer_release,
            explorer_frozen_checks,
            explorer_frozen_ask,
            read_shortcuts,
            save_shortcuts,
            records_automatic,
            pick_path,
            steam_games,
            add_game,
            game_screenshots,
            screenshot,
            theme_status,
            choose_theme,
            import_theme,
            export_theme,
            remove_theme,
            keep_theme,
            export_theme_draft,
            code_colours_status,
            choose_code_colours,
            remove_code_colours,
            vscode_themes,
            bring_in_vscode_theme,
            bring_in_code_colours_file,
            start_games_list,
            agent_features,
            choose_agent_features,
            online_status,
            choose_online,
            repo_status,
            nightly_watch,
            report_places,
            report_ours,
            report_their_form,
            report_open_issue,
            report_theirs
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // The updater (0.85.0, `docs/releases.md`): the host alone uses it; the window has no permission to call it.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Where the installer put its own Python and tool kit, and this person's data folder (0.35.0): used where the program
            // does not run beside the repository it was built from.
            if let (Ok(resources), Ok(data)) = (app.path().resource_dir(), app.path().app_local_data_dir()) {
                companion_core::set_installed(resources.join("runtime"), data);
            }
            // The records copy themselves every few hours while the program is open (0.29.0).
            records_backup::start();
            // A newer published version is looked for once, a few seconds after the start (0.85.0).
            updates::start(app.handle());
            // The computer's activity, read once a second for the status bar (0.86.0).
            companion_core::activity::start();
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("the desktop window could not start")
        .run(|_, event| {
            // A snapshot of the running game is never left held when the program closes (owner's choice, 20 Nov 2026).
            if let tauri::RunEvent::Exit = event {
                before_exit();
                // An update fetched while the program ran installs now, and the program does not open again (0.85.0).
                updates::install_on_exit();
            }
        });
}
