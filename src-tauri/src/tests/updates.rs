use super::*;
use serde_json::json;

#[test]
fn the_key_is_set_only_when_the_public_key_is_there() {
    assert!(!key_set(&json!({})));
    assert!(!key_set(&json!({"updater": {"pubkey": ""}})));
    assert!(!key_set(&json!({"updater": {"pubkey": "   "}})));
    assert!(key_set(&json!({"updater": {"pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWdu"}})));
}

#[test]
fn the_shipped_settings_read_the_latest_published_release() {
    let config: serde_json::Value = serde_json::from_str(include_str!("../../tauri.conf.json")).unwrap();
    let updater = &config["plugins"]["updater"];
    assert_eq!(
        updater["endpoints"],
        json!(["https://github.com/phobos-dthorga/phobos-companion/releases/latest/download/latest.json"]),
        "only a published release is the latest; a draft reaches no one"
    );
    assert_eq!(updater["windows"]["installMode"], "passive");
    assert!(updater["pubkey"].is_string(), "the plugin refuses to start without the key's field");
    // The owner's public update key (minisign F729C046867F3956), from their one-time setup of 25 Nov 2026.
    assert!(key_set(&config["plugins"]), "the program carries the owner's public update key");
    assert_eq!(
        config["bundle"]["createUpdaterArtifacts"],
        json!(null),
        "only a build with the key signs (scripts/installer.mjs)"
    );
}

#[test]
fn the_kind_starts_on_with_its_switch() {
    let kind = online::KINDS.iter().find(|k| k.id == KIND).expect("updates is a kind of online call");
    assert!(kind.starts_on, "the owner's choice: an auto-updater, with a switch");
    assert_eq!(kind.contacts, "github.com");
}

#[test]
fn nothing_installs_when_nothing_is_ready() {
    let mut closed = false;
    assert!(install_now(|| closed = true).is_err());
    assert!(!closed, "nothing is closed for an update that is not there");
    install_on_exit();
}

#[test]
fn the_window_reads_each_state_by_its_name() {
    assert_eq!(serde_json::to_value(Status::NotSetUp).unwrap(), json!({"state": "not-set-up"}));
    assert_eq!(
        serde_json::to_value(Status::Fetching { version: "0.86.0".into(), got: 10, total: Some(20) }).unwrap(),
        json!({"state": "fetching", "version": "0.86.0", "got": 10, "total": 20})
    );
}
