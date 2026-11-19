use std::env;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

fn main() {
    // What the About page says about this build (0.25.0): the commit it was built from, when, and where the build output went
    // (its installers are found there). Built again whenever the repository moves to another commit.
    println!("cargo:rerun-if-changed=../.git/logs/HEAD");
    println!("cargo:rerun-if-env-changed=CARGO_TARGET_DIR");
    let commit = Command::new("git")
        .args(["--no-optional-locks", "-c", "core.fsmonitor=false", "rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_owned())
        .unwrap_or_default();
    println!("cargo:rustc-env=COMPANION_BUILT_COMMIT={commit}");
    let unix = SystemTime::now().duration_since(UNIX_EPOCH).map(|since| since.as_secs()).unwrap_or(0);
    println!("cargo:rustc-env=COMPANION_BUILT_UNIX={unix}");
    if let Ok(target) = env::var("CARGO_TARGET_DIR") {
        println!("cargo:rustc-env=COMPANION_TARGET_DIR={target}");
    }
    tauri_build::build()
}
