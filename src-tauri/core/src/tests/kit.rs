use super::*;

fn envelope(body: &str) -> Vec<u8> {
    body.as_bytes().to_vec()
}

#[test]
fn the_kits_fingerprint_moves_with_its_files_and_not_its_bytecode() {
    let folder = env::temp_dir().join(format!("companion-kit-print-{}", std::process::id()));
    let package = folder.join(PACKAGE);
    std::fs::create_dir_all(package.join("games").join("__pycache__")).unwrap();
    std::fs::write(package.join("__init__.py"), "x = 1\n").unwrap();
    std::fs::write(package.join("games").join("one.py"), "y = 2\n").unwrap();
    let first = kit_fingerprint(&package).unwrap();
    assert!(first.starts_with("2:"));
    std::fs::write(package.join("games").join("__pycache__").join("one.cpython-314.pyc"), "bytes").unwrap();
    assert_eq!(kit_fingerprint(&package).unwrap(), first, "bytecode is not the kit");
    std::fs::write(package.join("games").join("one.py"), "y = 22\n").unwrap();
    let changed = kit_fingerprint(&package).unwrap();
    assert_ne!(changed, first, "a changed file asks the manifest again");
    std::fs::write(package.join("games").join("two.json"), "{}").unwrap();
    assert!(kit_fingerprint(&package).unwrap().starts_with("3:"));
    std::fs::remove_dir_all(&folder).unwrap();
    assert_eq!(kit_fingerprint(&package), None, "a missing kit is never a kept manifest");
}

#[test]
fn counts_the_commands_in_a_manifest() {
    let text = envelope(r#"{"envelope":1,"tool":"manifest","kit_version":"1.0.0","data":{"commands":[{},{}]}}"#);
    assert_eq!(
        parse_envelope(&text, "manifest").and_then(|v| status_of(&v)),
        Ok(KitStatus { kit_version: "1.0.0".to_owned(), tools: 2, source: runtime().source.to_owned() })
    );
}

#[test]
fn refuses_text_that_is_not_json() {
    assert_eq!(parse_envelope(b"usage: nothing", "manifest").unwrap_err().code, FailureCode::Unreadable);
}

#[test]
fn refuses_an_envelope_it_does_not_know() {
    let text = envelope(r#"{"envelope":2,"tool":"manifest","kit_version":"9.0.0","data":{"commands":[]}}"#);
    assert_eq!(parse_envelope(&text, "manifest").unwrap_err().code, FailureCode::Unreadable);
}

#[test]
fn refuses_another_tools_answer() {
    let text = envelope(r#"{"envelope":1,"tool":"gate","kit_version":"1.0.0","data":{"commands":[]}}"#);
    assert_eq!(parse_envelope(&text, "manifest").unwrap_err().code, FailureCode::Unreadable);
}

#[test]
fn refuses_an_answer_with_no_commands() {
    let text = envelope(r#"{"envelope":1,"tool":"manifest","kit_version":"1.0.0","data":{}}"#);
    assert_eq!(
        parse_envelope(&text, "manifest").and_then(|v| status_of(&v)).unwrap_err().code,
        FailureCode::Unreadable
    );
}

#[test]
fn failure_codes_reach_the_window_in_its_spelling() {
    let failure = Failure::new(FailureCode::PythonMissing, "none");
    assert_eq!(serde_json::to_value(failure).unwrap()["code"], "python_missing");
}

/// The real path: the pinned kit, run by the real Python.
#[test]
fn reads_the_pinned_kit() {
    let status = read_status().expect("the pinned kit should answer");
    assert!(status.tools >= 15, "only {} tools", status.tools);
    assert!(!status.kit_version.is_empty());
}

#[test]
fn a_progress_line_is_told_from_a_tools_own_text() {
    let counted = parse_progress(r#"{"progress": 1, "label": "Building Thing", "step": 3, "of": 23}"#).unwrap();
    assert_eq!((counted.label.as_deref(), counted.step, counted.of), (Some("Building Thing"), Some(3), Some(23)));
    let detail = parse_progress(r#"  {"progress": 1, "detail": "copied 4 files"}  "#).unwrap();
    assert_eq!((detail.label, detail.detail.as_deref()), (None, Some("copied 4 files")));
    assert_eq!(parse_progress("error: the build failed"), None);
    assert_eq!(parse_progress(r#"{"progress": "#), None);
    assert_eq!(parse_progress(r#"{"other": 1}"#), None);
}

/// Runs the pinned kit for real, on this repository's own changelog, so it needs Python: cargo test -- --ignored
#[test]
#[ignore = "needs Python and the pinned kit on this PC"]
fn hears_a_real_tool_while_it_works_and_still_reads_its_answer() {
    use std::sync::Mutex;
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let arguments: Vec<String> =
        ["changes", "list", "--root", &root.display().to_string(), "--json"].iter().map(|s| (*s).to_owned()).collect();
    let heard = Mutex::new(Vec::new());
    let listener = |progress: Progress| heard.lock().unwrap().push(progress);
    let answer = run_hearing("changes", &arguments, Some(&listener)).unwrap();
    assert_eq!(answer["data"]["changelogs"][0]["changelog"], "CHANGELOG.md");
    let heard = heard.into_inner().unwrap();
    assert!(heard.iter().any(|p| p.label.as_deref() == Some("Reading CHANGELOG.md") && p.of == Some(1)), "{heard:?}");
    // Without a listener the same tool is run silently and answers the same.
    assert_eq!(run("changes", &arguments).unwrap()["data"]["changelogs"], answer["data"]["changelogs"]);
}

#[test]
fn one_rule_reads_every_answer() {
    use serde_json::json;
    assert!(Outcome::of(&json!({"data": {"files": []}})).ok);
    assert!(Outcome::of(&json!({"data": {"ok": true}})).ok);
    let refused = Outcome::of(&json!({"data": {"ok": false, "refusal": "The game is running."}}));
    assert!(!refused.ok);
    assert_eq!(refused.refusal.as_deref(), Some("The game is running."));
    assert!(Outcome::required(&json!({"data": {"ok": false, "refusal": "no"}})).is_err());
    assert!(Outcome::required(&json!({"data": {}})).is_ok());
}

#[test]
fn finds_a_report_by_what_it_does_and_checks_its_effect() {
    let manifest = serde_json::json!({"data": {"commands": [
        {"name": "other-game-code", "game": "other", "reports": [{"name": "show", "surface": "other-code", "effect": "reads"}]},
        {"name": "rimworld-code", "game": "rimworld", "reports": [
            {"name": "show", "surface": "other-code", "effect": "reads"},
            {"name": "decompile", "surface": "other-code", "effect": "runs"}]}]}});
    assert_eq!(
        offered(&manifest, "rimworld", "other-code", "show", "reads"),
        Offered::Tool("rimworld-code".to_owned())
    );
    assert_eq!(
        offered(&manifest, "rimworld", "other-code", "decompile", "runs"),
        Offered::Tool("rimworld-code".to_owned())
    );
    assert_eq!(offered(&manifest, "kenshi", "other-code", "show", "reads"), Offered::Missing);
    assert!(matches!(offered(&manifest, "rimworld", "other-code", "show", "runs"), Offered::Changed(_)));
}

#[test]
fn an_unnamed_report_is_checked_by_an_empty_name() {
    let manifest = serde_json::json!({"data": {"commands": [
        {"name": "cleanup", "game": null, "reports": [{"name": null, "effect": "writes"}]},
        {"name": "reader", "game": null, "reports": [{"name": null, "effect": "reads"}]}]}});
    assert!(allowed_by_manifest(&manifest, "cleanup", "").is_ok());
    assert!(allowed_by_manifest(&manifest, "cleanup", "apply").is_err());
    assert!(allowed_by_manifest(&manifest, "reader", "").is_err());
}

#[test]
fn a_command_with_no_reports_is_found_by_its_surface() {
    let manifest = serde_json::json!({"data": {"commands": [
        {"name": "rimworld-update-check", "game": "rimworld", "reports": [{"name": null, "surface": "update-check", "effect": "runs"}]},
        {"name": "rimworld-code", "game": "rimworld", "reports": [{"name": "show", "surface": "update-check", "effect": "runs"}]}]}});
    assert_eq!(
        offered(&manifest, "rimworld", "update-check", "", "runs"),
        Offered::Tool("rimworld-update-check".to_owned())
    );
    assert_eq!(
        offered(&manifest, "rimworld", "update-check", "show", "runs"),
        Offered::Tool("rimworld-code".to_owned())
    );
    assert!(matches!(offered(&manifest, "rimworld", "update-check", "", "reads"), Offered::Changed(_)));
}

// ---------------------------------------------------------------- where the kit and its Python are (0.35.0)

#[test]
fn the_kit_is_found_beside_its_repository_first_then_where_the_installer_put_it() {
    let runtime = std::env::temp_dir().join(format!("companion-runtime-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&runtime);
    std::fs::create_dir_all(runtime.join("kit").join(PACKAGE)).unwrap();
    std::fs::create_dir_all(runtime.join("python")).unwrap();
    std::fs::write(runtime.join("python").join("python.exe"), b"").unwrap();

    // The environment wins.
    let named = locate(Some(PathBuf::from("/kit")), Some("py".into()), None, Some(&runtime));
    assert_eq!((named.kit, named.python.as_str(), named.source), (PathBuf::from("/kit"), "py", "environment"));
    // Beside the repository it was built from (the owner's PC): that kit, with the Python on the PATH, as before.
    let built = locate(None, None, Some(PathBuf::from("/repo")), Some(&runtime));
    assert_eq!(built.source, "build-folder");
    assert!(built.kit.ends_with(Path::new("external").join("phobos-modkit").join("python")));
    assert_eq!(built.python, DEFAULT_PYTHON);
    // A stranger's PC: the installer's own kit and Python.
    let installed = locate(None, None, None, Some(&runtime));
    assert_eq!((installed.kit, installed.source), (runtime.join("kit"), "installed"));
    assert!(installed.python.ends_with("python.exe"));
    std::fs::remove_dir_all(&runtime).unwrap();
}

#[test]
fn only_a_report_the_owner_presses_is_run_on_a_press() {
    let manifest = serde_json::json!({"data": {"commands": [
        {"name": "steam-publish", "reports": [
            {"name": "upload", "effect": "owner-press"},
            {"name": "old", "effect": "owner-only"},
            {"name": "page", "effect": "writes"}]}]}});
    assert!(allowed_on_press(&manifest, "steam-publish", "upload").is_ok());
    assert!(allowed_on_press(&manifest, "steam-publish", "old").is_err());
    assert!(allowed_on_press(&manifest, "steam-publish", "page").is_err());
    assert!(allowed_on_press(&manifest, "steam-publish", "nothing").is_err());
    // A report the owner presses is never one the program runs as a plain change.
    assert!(allowed_by_manifest(&manifest, "steam-publish", "upload").is_err());
}

#[test]
fn only_a_report_that_reads_is_run_by_the_program_itself() {
    let manifest = serde_json::json!({"data": {"commands": [
        {"name": "zeroed", "reports": [
            {"name": "status", "effect": "reads"},
            {"name": "restore", "effect": "writes"}]},
        {"name": "crash-dump", "reports": [{"name": null, "effect": "reads"}]},
        {"name": "feeds", "reports": [{"name": "read", "effect": "reads-online"}]}]}});
    assert!(reads_only(&manifest, "zeroed", "status").is_ok());
    assert!(reads_only(&manifest, "crash-dump", "").is_ok(), "a command's one unnamed report");
    assert!(reads_only(&manifest, "zeroed", "restore").is_err());
    assert!(reads_only(&manifest, "feeds", "read").is_err(), "going online is not reading here");
    assert!(reads_only(&manifest, "zeroed", "nothing").is_err());
    assert!(reads_online(&manifest, "feeds", "read").is_ok());
}
