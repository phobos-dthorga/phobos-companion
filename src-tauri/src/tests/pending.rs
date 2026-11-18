use super::*;
use serde_json::json;
use std::path::Path;

fn repository(name: &str) -> Repository {
    Repository { name: name.to_owned(), path: Path::new("/work").join(name) }
}

#[test]
fn every_repository_is_asked_about_in_one_run() {
    let (one, two) = (repository("one"), repository("two"));
    let arguments = arguments(&[&one, &two]);
    assert_eq!(arguments[..2], ["changes", "pending"]);
    assert_eq!(arguments.iter().filter(|a| *a == "--root").count(), 2);
    assert_eq!(arguments.last().map(String::as_str), Some("--json"));
}

#[test]
fn the_answer_is_matched_to_each_repository_in_order() {
    let (one, two) = (repository("one"), repository("two"));
    let answer = json!({"data": {"repositories": [
        {"repository": "one", "pending": [{"product": "D'thorga Framework", "unreleased": 0, "draftVersion": "0.46.1",
                                           "draftDate": "2026-11-09", "earlierDrafts": 1}]},
        {"repository": "two", "pending": []}
    ]}});
    let found = pending_of(&answer, &[&one, &two]);
    let framework = &found[&one.path][0];
    assert_eq!(framework.product, "D'thorga Framework");
    assert_eq!(framework.repository, "one");
    assert_eq!(framework.draft_version.as_deref(), Some("0.46.1"));
    assert_eq!(framework.draft_date.as_deref(), Some("2026-11-09"));
    assert_eq!(framework.earlier_drafts, 1);
    assert!(found[&two.path].is_empty());
}

#[test]
fn an_answer_with_nothing_in_it_leaves_nothing_pending() {
    let one = repository("one");
    assert!(pending_of(&json!({"data": {}}), &[&one]).is_empty());
}
