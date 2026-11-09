//! The desktop host: it runs the tools and tells the window what they said. The window only presents.

mod kit;

/// How the tools are: read on a worker thread, since it starts a process.
#[tauri::command]
async fn kit_status() -> Result<kit::KitStatus, kit::KitFailure> {
    tauri::async_runtime::spawn_blocking(kit::read_status)
        .await
        .map_err(|problem| kit::KitFailure::new(kit::KitFailureCode::ToolFailed, problem.to_string()))?
}

/// Starts the program.
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![kit_status])
        .run(tauri::generate_context!())
        .expect("the desktop window could not start");
}
