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
fn restore_and_let_go_pass_the_windows_text_as_one_argument_each() {
    let root = Path::new("R:/repository");
    assert_eq!(
        restore_arguments(root, "lora-trainings", Some("house-v1"), Path::new("D:/Restored"), false),
        [
            "safe-copies",
            "restore",
            "--root",
            "R:/repository",
            "--set=lora-trainings",
            "--unit=house-v1",
            "--to",
            "D:/Restored",
            "--no-redact",
            "--json"
        ]
    );
    assert!(restore_arguments(root, "saves", None, Path::new("D:/Restored"), true).contains(&"--overwrite".to_owned()));
    assert_eq!(
        let_go_arguments(root, "rimworld/saves/PG15.rws"),
        [
            "safe-copies",
            "let-go",
            "--root",
            "R:/repository",
            "--file=rimworld/saves/PG15.rws",
            "--apply",
            "--no-redact",
            "--json"
        ]
    );
}

#[test]
fn names_and_copies_from_the_window_are_checked_before_the_kit_sees_them() {
    assert!(set_name("lora-trainings") && set_name("house-v1") && set_name("art_notes.2"));
    assert!(!set_name("") && !set_name("-rf") && !set_name("../up") && !set_name("a b"));
    assert!(copy_name("rimworld/saves/PG15.rws"));
    for bad in
        ["saves/PG15.rws", "rimworld/../x/y", "/rimworld/saves/a", "-x/y/z", "rimworld\\saves\\a", "C:/x/y", "a//b/c"]
    {
        assert!(!copy_name(bad), "{bad}");
    }
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
