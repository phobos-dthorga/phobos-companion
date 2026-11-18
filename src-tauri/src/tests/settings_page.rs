use super::*;
use serde_json::json;

#[test]
fn the_list_names_every_repository_and_asks_for_full_paths() {
    let roots = [PathBuf::from("one"), PathBuf::from("two")];
    assert_eq!(list_arguments(&roots), ["settings", "list", "--root", "one", "--root", "two", "--no-redact", "--json"]);
}

#[test]
fn a_key_is_letters_and_digits_only() {
    assert!(setting_key("historyPath"));
    assert!(!setting_key(""));
    assert!(!setting_key("--clear"));
    assert!(!setting_key("history path"));
    assert!(!setting_key(&"a".repeat(MAX_KEY + 1)));
}

#[test]
fn a_value_is_one_line_never_read_as_an_option() {
    assert!(setting_value("K:\\phobos-modkit\\history"));
    assert!(setting_value("  /home/someone/history  "));
    assert!(!setting_value("   "));
    assert!(!setting_value("--clear"));
    assert!(!setting_value("K:\\one\nK:\\two"));
    assert!(!setting_value(&"x".repeat(MAX_VALUE + 1)));
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
