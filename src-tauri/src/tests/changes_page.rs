use super::*;
use serde_json::json;

#[test]
fn an_entry_is_asked_for_as_one_argument_folded_onto_one_line() {
    let arguments =
        entry_arguments(Path::new("repo"), "mods/Thing/CHANGELOG.md", "  **Boats float.**\n On water. ").unwrap();
    assert_eq!(
        arguments,
        [
            "changes",
            "entry",
            "--root",
            "repo",
            "--changelog",
            "mods/Thing/CHANGELOG.md",
            "--text=**Boats float.** On water.",
            "--json"
        ]
    );
    let dashed = entry_arguments(Path::new("repo"), "CHANGELOG.md", "--apply everything").unwrap();
    assert_eq!(dashed[6], "--text=--apply everything");
    assert!(entry_arguments(Path::new("repo"), "CHANGELOG.md", "   ").is_err());
    assert!(entry_arguments(Path::new("repo"), "CHANGELOG.md", &"x".repeat(MAX_TEXT + 1)).is_err());
    assert!(entry_arguments(Path::new("repo"), "../CHANGELOG.md", "Boats float.").is_err());
}

#[test]
fn a_refusal_comes_back_in_words_and_an_answer_as_found() {
    let refused = result_of(&json!({"data": {"ok": false, "refusal": "That entry is not in this changelog."}}), "repo");
    assert!(!refused.found);
    assert_eq!(refused.refusal.as_deref(), Some("That entry is not in this changelog."));
    let found = result_of(&json!({"data": {"commit": {"hash": "abc"}, "files": []}}), "repo");
    assert!(found.found);
    assert_eq!(found.code["commit"]["hash"], "abc");
}

#[test]
fn a_commits_code_is_asked_for_by_its_hash_alone() {
    assert_eq!(
        commit_arguments(Path::new("repo"), "mods/Old/CHANGELOG.md", "401c6a93").unwrap(),
        ["changes", "entry", "--root", "repo", "--changelog", "mods/Old/CHANGELOG.md", "--commit=401c6a93", "--json"]
    );
    assert!(commit_arguments(Path::new("repo"), "mods/Old/CHANGELOG.md", "--all").is_err());
    assert!(commit_arguments(Path::new("repo"), "../CHANGELOG.md", "401c6a93").is_err());
}

#[test]
fn the_list_asks_for_every_version_of_one_repository_to_page_through() {
    assert_eq!(list_arguments(Path::new("repo")), ["changes", "list", "--root", "repo", "--versions", "0", "--json"]);
}
