use super::*;
use serde_json::json;

#[test]
fn the_timeline_asks_for_every_repository_and_the_games_log_in_one_run() {
    let arguments = timeline_arguments(&[Path::new("one"), Path::new("two")], "rimworld");
    assert_eq!(
        arguments,
        ["history", "timeline", "--root", "one", "--root", "two", "--game=rimworld", "--top=0", "--json"]
    );
    assert_eq!(timeline_arguments(&[Path::new("r")], "--apply")[4], "--game=--apply");
}

#[test]
fn reading_as_it_stood_names_a_commit_or_a_moment_and_stays_in_the_repository() {
    let by_commit = at_arguments(Path::new("repo"), "mods/Thing/CHANGELOG.md", Some("401c6a93"), None).unwrap();
    assert_eq!(
        by_commit,
        ["history", "at", "--root", "repo", "--changelog", "mods/Thing/CHANGELOG.md", "--commit=401c6a93", "--json"]
    );
    let by_moment = at_arguments(Path::new("repo"), "CHANGELOG.md", None, Some("2026-11-12T15:00")).unwrap();
    assert_eq!(by_moment[6], "--when=2026-11-12T15:00");
    assert!(at_arguments(Path::new("repo"), "../CHANGELOG.md", Some("401c6a93"), None).is_err());
    assert!(at_arguments(Path::new("repo"), "CHANGELOG.md", Some("nope"), None).is_err());
    assert!(at_arguments(Path::new("repo"), "CHANGELOG.md", None, None).is_err());
    assert!(at_arguments(Path::new("repo"), "CHANGELOG.md", None, Some("--all")).is_err());
}

#[test]
fn a_refusal_comes_back_in_words_and_an_answer_as_found() {
    let refused = stood_of(&json!({"data": {"ok": false, "refusal": "CHANGELOG.md did not exist yet."}}));
    assert!(!refused.found);
    assert_eq!(refused.refusal.as_deref(), Some("CHANGELOG.md did not exist yet."));
    let found = stood_of(&json!({"data": {"product": "Thing", "versions": []}}));
    assert!(found.found);
    assert_eq!(found.stood["product"], "Thing");
}
