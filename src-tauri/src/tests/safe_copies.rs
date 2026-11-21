use super::*;
use serde_json::json;
use std::fs;

#[test]
fn every_request_names_its_repository_and_asks_for_full_paths_in_json() {
    let root = Path::new("R:/repository");
    assert_eq!(status_arguments(root), ["safe-copies", "status", "--root", "R:/repository", "--no-redact", "--json"]);
    assert_eq!(run_arguments(root), ["safe-copies", "run", "--root", "R:/repository", "--no-redact", "--json"]);
    assert_eq!(verify_arguments(root), ["safe-copies", "verify", "--root", "R:/repository", "--no-redact", "--json"]);
}

#[test]
fn only_a_repository_with_the_list_opts_in() {
    let folder = std::env::temp_dir().join(format!("companion-safe-copies-{}", std::process::id()));
    fs::create_dir_all(folder.join("config")).unwrap();
    assert!(!opts_in(&folder));
    fs::write(config_path(&folder), "{}").unwrap();
    assert!(opts_in(&folder));
    fs::remove_dir_all(&folder).unwrap();
}

#[test]
fn a_refusal_comes_back_with_its_reason_and_a_run_with_its_title() {
    let refused = result_of(&json!({"report": {"title": "Refused: no destination is ready"},
                                    "data": {"ok": false, "refusal": "no destination is ready"}}));
    assert!(!refused.ok);
    assert_eq!(refused.refusal.as_deref(), Some("no destination is ready"));
    let copied = result_of(&json!({"report": {"title": "Safe copies: 3 files copied"},
                                   "data": {"ok": true, "results": [{"destination": "local", "copied": []}]}}));
    assert!(copied.ok);
    assert_eq!(copied.title, "Safe copies: 3 files copied");
    assert_eq!(copied.data["results"][0]["destination"], "local");
}
