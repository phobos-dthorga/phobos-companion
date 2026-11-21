//! The desktop host: it reads what the window shows. The window only presents.

//! What more than one part uses, and needs no window, lives in the `companion-core` crate (`core/`): the games list, the tool kit,
//! request checks, failures. This file holds the Tauri commands, each one line of delegation on a worker thread.

mod about_page;
mod changes_page;
mod claims_board;
mod cleanup_page;
mod connections_page;
mod decisions_page;
mod explorer_page;
mod game_files_page;
mod games_page;
mod history_page;
mod home;
mod installs_page;
mod kit_pins;
mod logs_page;
mod makeup_page;
mod memory_page;
mod mod_list_page;
mod open_work;
mod other_code_page;
mod patch_targets;
mod pending;
mod pick;
mod pictures;
mod records_backup;
mod reports;
mod safe_copies;
mod screen_notes;
mod settings_ledger;
mod settings_page;
mod shortcuts;
mod tests_page;
mod themes_page;

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
    game: String,
    online: bool,
    on_progress: Channel<kit::Progress>,
) -> Result<serde_json::Value, Failure> {
    blocking(move || mod_list_page::read(&game, online, Some(&hearing(on_progress)))).await
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

/// One change from Edit the list, saved at once on the owner's press: switch off, switch on or move (0.46.0).
#[tauri::command]
async fn mod_list_edit(
    game: String,
    list: String,
    action: String,
    id: String,
    place: Option<u32>,
    on_progress: Channel<kit::Progress>,
) -> Result<mod_list_page::ChangeResult, Failure> {
    blocking(move || mod_list_page::edit(&game, &list, &action, &id, place, Some(&hearing(on_progress)))).await
}

/// Opens a mod's Workshop page in the Steam client: only a number a check named (0.45.0).
#[tauri::command]
async fn mod_list_open_in_steam(number: String) -> Result<(), Failure> {
    blocking(move || mod_list_page::open_in_steam(&number)).await
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
            cleanup_list,
            cleanup_apply,
            mod_list_check,
            mod_list_change,
            mod_list_undo,
            mod_list_open_in_steam,
            mod_list_mods,
            mod_list_edit,
            their_code,
            decompile_assembly,
            updates,
            keep_builds,
            update_check,
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
            answer_decision,
            game_files,
            show_game_file,
            memory_status,
            memory_report,
            memory_start,
            memory_stop,
            memory_mark,
            explorer_offer,
            explorer_start,
            explorer_ask,
            explorer_release,
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
            start_games_list,
            agent_features,
            choose_agent_features
        ])
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Where the installer put its own Python and tool kit, and this person's data folder (0.35.0): used where the program
            // does not run beside the repository it was built from.
            if let (Ok(resources), Ok(data)) = (app.path().resource_dir(), app.path().app_local_data_dir()) {
                companion_core::set_installed(resources.join("runtime"), data);
            }
            // The records copy themselves every few hours while the program is open (0.29.0).
            records_backup::start();
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("the desktop window could not start")
        .run(|_, event| {
            // A snapshot of the running game is never left held when the program closes (owner's choice, 20 Nov 2026).
            if let tauri::RunEvent::Exit = event {
                explorer_page::release_at_exit();
            }
        });
}
