use super::*;

#[test]
fn every_repository_is_read_for_its_own_results_in_one_run() {
    let roots = [PathBuf::from("first"), PathBuf::from("second")];
    assert_eq!(arguments(&roots), ["feeds", "read", "--root", "first", "--root", "second", "--json"]);
}

#[test]
fn switched_off_nothing_is_asked() {
    let data = std::env::temp_dir().join(format!("companion-nightly-{}", std::process::id()));
    std::fs::create_dir_all(&data).unwrap();
    online::choose(&data, KIND, false).unwrap();
    let answer = read(&data, "no-such-game", None).unwrap();
    assert_eq!(answer["switchedOn"], false);
    assert_eq!(answer["feeds"], serde_json::json!([]));
    std::fs::remove_dir_all(&data).unwrap();
}
