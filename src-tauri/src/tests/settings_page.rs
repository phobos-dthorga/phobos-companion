use super::*;
use serde_json::json;

#[test]
fn the_list_names_every_repository_and_asks_for_full_paths() {
    let roots = [PathBuf::from("one"), PathBuf::from("two")];
    assert_eq!(list_arguments(&roots), ["settings", "list", "--root", "one", "--root", "two", "--no-redact", "--json"]);
}

#[test]
fn setting_and_clearing_are_asked_for_as_single_arguments() {
    let roots = [PathBuf::from("repo")];
    assert_eq!(
        set_arguments("historyPath", Some(" K:\\history "), &roots).unwrap(),
        ["settings", "set", "--key=historyPath", "--root", "repo", "--value=K:\\history", "--json"]
    );
    assert_eq!(
        set_arguments("historyPath", None, &roots).unwrap(),
        ["settings", "set", "--key=historyPath", "--root", "repo", "--clear", "--json"]
    );
    assert!(set_arguments("--all", None, &roots).is_err());
    assert!(set_arguments("historyPath", Some("-x"), &roots).is_err());
}

#[test]
fn a_refusal_is_not_a_success() {
    let refused = result_of(&json!({"data": {"ok": false, "refusal": "'x' is not a setting the tools read."}}));
    assert!(!refused.ok);
    assert_eq!(refused.refusal.as_deref(), Some("'x' is not a setting the tools read."));
    let done = result_of(&json!({"data": {"ok": true, "centralFile": "C:/central/settings.json"}}));
    assert!(done.ok);
    assert_eq!(done.central_file.as_deref(), Some("C:/central/settings.json"));
}
