use super::*;
use serde_json::json;

#[test]
fn the_status_and_the_backup_ask_for_full_paths_in_json() {
    assert_eq!(status_arguments(), ["records", "status", "--every-hours", "6", "--no-redact", "--json"]);
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

#[test]
fn the_timer_marks_the_copy_it_makes() {
    assert_eq!(automatic_arguments(), ["records", "backup", "--automatic", "--no-redact", "--json"]);
}

#[test]
fn only_a_status_that_says_due_makes_a_copy() {
    assert!(is_due(&json!({"due": true, "folder": "N:/Backups"})));
    assert!(!is_due(&json!({"due": false})));
    // A kit from before 1.55.0 does not say: the timer then never copies.
    assert!(!is_due(&json!({"folder": "N:/Backups", "stale": true})));
}

#[test]
fn a_missed_copy_is_made_soon_after_opening_or_waking() {
    // The owner's "soonest next opportunity": the timer looks far more often than copies fall due.
    assert!(LOOK_EVERY.as_secs() * 6 <= u64::from(EVERY_HOURS) * 3600);
    assert!(FIRST_LOOK < LOOK_EVERY);
}
