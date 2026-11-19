use super::*;

#[test]
fn each_question_is_one_read_only_run() {
    let root = Path::new("repo");
    assert_eq!(arguments(root, &Question::Now), ["makeup", "now", "--root", "repo", "--json"]);
    assert_eq!(arguments(root, &Question::Churn(30)), ["makeup", "churn", "--root", "repo", "--days", "30", "--json"]);
    assert_eq!(arguments(root, &Question::Census), ["makeup", "census", "--root", "repo", "--json"]);
}

#[test]
fn an_unknown_question_or_a_look_back_too_long_is_refused() {
    assert!(question("delete", None).is_err());
    assert!(question("churn", Some(10_000)).is_err());
    assert_eq!(question("churn", None).unwrap(), Question::Churn(30));
    assert_eq!(question("growth", None).unwrap(), Question::Growth);
}
