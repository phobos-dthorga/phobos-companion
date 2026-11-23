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

/// Hands an address to the system, which opens it with the program it keeps for that kind (a `steam://` address in the Steam
/// client, an `https://` one in the browser). Callers check the address first: only one built from what the tools named (0.65.0,
/// shared by the Mod list's Steam pages and the Logs page's report links).
pub fn open_address(address: &str) -> std::io::Result<()> {
    #[cfg(target_os = "windows")]
    let started = Command::new("explorer").arg(address).spawn();
    #[cfg(target_os = "macos")]
    let started = Command::new("open").arg(address).spawn();
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let started = Command::new("xdg-open").arg(address).spawn();
    started.map(|_| ())
}

/// Starts a process as the leader of a process group of its own (0.74.0), so `end_tree` can end everything it starts on Linux and
/// macOS too: an agent on the Chat page starts helpers of its own. On Windows `taskkill /T` follows the tree without it.
#[cfg(unix)]
pub fn own_group(command: &mut Command) {
    use std::os::unix::process::CommandExt;
    command.process_group(0);
}

#[cfg(not(unix))]
pub fn own_group(_command: &mut Command) {}

/// Ends a process and every process it started. A kit command that holds something (a snapshot of a running game) may have
/// started a helper of its own, which ending the kit's Python alone would leave running until it noticed. On Windows that is
/// Windows' own `taskkill` from the system folder, with no console. Elsewhere (0.74.0) the system's `kill` ends the process
/// group a process started with `own_group` leads; for any other process that finds no group, and the process alone is ended.
/// **Not yet built or tried on Linux or macOS.**
pub fn end_tree(child: &mut std::process::Child) {
    if matches!(child.try_wait(), Ok(Some(_))) {
        return;
    }
    #[cfg(unix)]
    {
        let _ = Command::new("kill")
            .args(["-TERM", &format!("-{}", child.id())])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
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
