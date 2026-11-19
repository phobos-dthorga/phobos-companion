use super::*;
use serde_json::json;

#[test]
fn each_question_becomes_one_checked_run() {
    let root = Path::new("repo");
    assert_eq!(arguments(root, &Question::Summary).unwrap(), ["connections", "summary", "--root", "repo", "--json"]);
    assert_eq!(
        arguments(root, &Question::Around("cs:Sample.Boat.Tick".to_owned())).unwrap(),
        ["connections", "around", "--root", "repo", "--node=cs:Sample.Boat.Tick", "--json"]
    );
    assert_eq!(
        arguments(root, &Question::Flow("lua:Lamps.light".to_owned(), 3)).unwrap(),
        ["connections", "flow", "--root", "repo", "--node=lua:Lamps.light", "--depth", "3", "--json"]
    );
    assert_eq!(
        arguments(root, &Question::Find(" *Tick* ".to_owned())).unwrap(),
        ["connections", "find", "--root", "repo", "--name=*Tick*", "--top", "80", "--json"]
    );
    assert_eq!(
        arguments(root, &Question::Changed("401c6a93".to_owned())).unwrap(),
        ["connections", "changed", "--root", "repo", "--commit=401c6a93", "--json"]
    );
}

#[test]
fn a_malformed_question_never_runs() {
    let root = Path::new("repo");
    assert!(arguments(root, &Question::Around("--all".to_owned())).is_err());
    assert!(arguments(root, &Question::History("--all".to_owned())).is_err());
    assert_eq!(
        arguments(root, &Question::History("lua:Lamps.shine".to_owned())).unwrap(),
        ["connections", "history", "--root", "repo", "--node=lua:Lamps.shine", "--limit", "200", "--json"]
    );
    assert!(arguments(root, &Question::Flow("cs:A".to_owned(), 9)).is_err());
    assert!(arguments(root, &Question::Find("a\nb".to_owned())).is_err());
    assert!(arguments(root, &Question::Changed("HEAD~1".to_owned())).is_err());
    assert!(question("delete", None, None).is_err());
    assert!(question("around", None, None).is_err());
    assert_eq!(question("flow", Some("cs:A".to_owned()), None).unwrap(), Question::Flow("cs:A".to_owned(), 2));
}

#[test]
fn a_refusal_comes_back_in_words() {
    let refused =
        answer_of(&json!({"data": {"ok": false, "refusal": "'cs:Nothing' is not in this repository's connections."}}));
    assert!(!refused.ok);
    assert!(refused.refusal.unwrap().contains("not in this repository"));
    assert!(answer_of(&json!({"data": {"groups": []}})).ok);
}
