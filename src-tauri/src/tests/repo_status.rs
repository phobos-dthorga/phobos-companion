use super::*;
use serde_json::json;

fn roots() -> [PathBuf; 2] {
    [PathBuf::from("first"), PathBuf::from("second")]
}

#[test]
fn a_look_of_its_own_is_automatic_and_a_press_is_not() {
    assert_eq!(
        arguments(&roots(), true, false),
        ["repos", "status", "--root", "first", "--root", "second", "--online", "--automatic", "--json"]
    );
    assert_eq!(
        arguments(&roots(), true, true),
        ["repos", "status", "--root", "first", "--root", "second", "--online", "--json"]
    );
}

#[test]
fn switched_off_it_never_goes_online_even_on_a_press() {
    assert_eq!(arguments(&roots(), false, true), ["repos", "status", "--root", "first", "--root", "second", "--json"]);
}

#[test]
fn a_report_that_no_longer_only_reads_is_never_taken_online() {
    let manifest = |effect: &str| json!({"data": {"commands": [{"name": "repos", "reports": [{"name": "status", "effect": effect}]}]}});
    assert!(kit::reads_online(&manifest("reads-online"), TOOL, REPORT).is_ok());
    assert!(kit::reads_online(&manifest("writes"), TOOL, REPORT).is_err());
    assert!(kit::reads_online(&json!({"data": {"commands": []}}), TOOL, REPORT).is_err());
}
