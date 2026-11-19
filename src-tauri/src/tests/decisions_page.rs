use super::*;
use std::path::Path;

#[test]
fn ids_are_the_configs_own_shape() {
    assert!(decision_id("page-keys"));
    assert!(decision_id("s1-s5"));
    assert!(!decision_id("Page Keys"));
    assert!(!decision_id("-x"));
    assert!(!decision_id("../x"));
    assert!(!decision_id(""));
}

#[test]
fn an_answer_is_one_argument_each_and_words_stay_one_line() {
    let arguments = answer_arguments(Path::new("/repo"), "page-keys", "other", "  keep G\n for Logs ").unwrap();
    assert_eq!(
        arguments,
        [
            "decisions",
            "answer",
            "--root",
            "/repo",
            "--id=page-keys",
            "--option=other",
            "--words=keep G for Logs",
            "--json"
        ]
    );
    let plain = answer_arguments(Path::new("/repo"), "page-keys", "keep", "").unwrap();
    assert!(!plain.iter().any(|a| a.starts_with("--words")));
    assert!(answer_arguments(Path::new("/repo"), "page keys", "keep", "").is_err());
    assert!(answer_arguments(Path::new("/repo"), "page-keys", "keep", &"x".repeat(5000)).is_err());
}

#[test]
fn the_list_names_every_root() {
    let roots = [PathBuf::from("/a"), PathBuf::from("/b")];
    assert_eq!(list_arguments(&roots), ["decisions", "list", "--root", "/a", "--root", "/b", "--json"]);
}
