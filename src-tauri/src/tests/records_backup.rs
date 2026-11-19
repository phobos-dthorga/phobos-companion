use super::*;
use serde_json::json;

#[test]
fn the_status_and_the_backup_ask_for_full_paths_in_json() {
    assert_eq!(status_arguments(), ["records", "status", "--no-redact", "--json"]);
    assert_eq!(backup_arguments(), ["records", "backup", "--no-redact", "--json"]);
}

#[test]
fn a_refusal_comes_back_with_its_reason_and_a_copy_with_its_path() {
    let refused = result_of(&json!({"data": {"ok": false, "refusal": "choose a folder first"}}));
    assert!(!refused.ok);
    assert_eq!(refused.refusal.as_deref(), Some("choose a folder first"));
    let made = result_of(&json!({"data": {"copy": {"path": "N:/Backups/20261119-101500", "files": 4}}}));
    assert!(made.ok);
    assert_eq!(made.copy["files"], 4);
}
