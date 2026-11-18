use super::*;
use serde_json::json;

#[test]
fn a_well_formed_set_is_kept_as_sent() {
    let sent = json!({"format": 1, "enabled": true, "keys": {"page.timeline": "t", "code.next-file": null, "connections.back": "Backspace"}});
    assert_eq!(checked(&sent).unwrap(), sent);
}

#[test]
fn anything_else_is_refused_in_words() {
    assert!(checked(&json!({"format": 2, "enabled": true, "keys": {}})).is_err());
    assert!(checked(&json!({"format": 1, "keys": {}})).is_err());
    assert!(checked(&json!({"format": 1, "enabled": true})).is_err());
    assert!(checked(&json!({"format": 1, "enabled": true, "keys": {"../x": "a"}})).is_err());
    assert!(checked(&json!({"format": 1, "enabled": true, "keys": {"page.home": 5}})).is_err());
    assert!(checked(&json!({"format": 1, "enabled": true, "keys": {"page.home": "a\nb"}})).is_err());
    assert!(checked(&json!({"format": 1, "enabled": true, "keys": {"page.home": "x".repeat(41)}})).is_err());
}

#[test]
fn only_the_known_fields_are_written() {
    let sent = json!({"format": 1, "enabled": false, "keys": {}, "extra": "dropped"});
    assert_eq!(checked(&sent).unwrap(), json!({"format": 1, "enabled": false, "keys": {}}));
}
