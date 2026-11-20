//! Starting other programs from a windowed one.

use std::process::Command;

/// A windowed program would otherwise flash a console for every process it starts.
#[cfg(windows)]
pub fn hide_console(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
pub fn hide_console(_command: &mut Command) {}

/// Ends a process and every process it started. A kit command that holds something (a snapshot of a running game) may have
/// started a helper of its own, which ending the kit's Python alone would leave running until it noticed. On Windows that is
/// Windows' own `taskkill` from the system folder, with no console; elsewhere the process alone.
pub fn end_tree(child: &mut std::process::Child) {
    if matches!(child.try_wait(), Ok(Some(_))) {
        return;
    }
    #[cfg(windows)]
    {
        let system = std::env::var_os("SystemRoot").map_or_else(|| r"C:\Windows".into(), std::path::PathBuf::from);
        let mut command = Command::new(system.join("System32").join("taskkill.exe"));
        command
            .args(["/PID", &child.id().to_string(), "/T", "/F"])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null());
        hide_console(&mut command);
        let _ = command.status();
    }
    let _ = child.kill();
    let _ = child.wait();
}
