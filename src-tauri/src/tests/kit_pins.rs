use super::*;

#[test]
fn every_repository_is_asked_about_in_one_run() {
    let roots = [PathBuf::from("first"), PathBuf::from("second")];
    assert_eq!(arguments(&roots), ["pins", "status", "--root", "first", "--root", "second", "--json"]);
}
