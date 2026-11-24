use super::*;
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT: AtomicUsize = AtomicUsize::new(0);

fn scratch() -> std::path::PathBuf {
    let folder = std::env::temp_dir().join(format!(
        "companion-chat-{}-{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::SeqCst)
    ));
    std::fs::create_dir_all(&folder).unwrap();
    folder
}

#[test]
fn the_chat_page_starts_off_with_no_agent_chosen() {
    let data = scratch();
    let found = status(&data);
    assert_eq!((found.on, found.chosen.as_deref(), found.running.is_none()), (false, None, true));
    assert_eq!(found.commands, Mode::Ask, "commands start on Ask (the owner's choice, 25 Nov 2026)");
    assert!(found.agents.len() >= 3);
    std::fs::remove_dir_all(data).unwrap();
}

#[test]
fn the_switch_and_the_agent_are_kept_apart() {
    let data = scratch();
    choose(&data, "claude").unwrap();
    assert_eq!((status(&data).on, status(&data).chosen.as_deref()), (false, Some("claude")));
    switch(&data, true).unwrap();
    assert_eq!((status(&data).on, status(&data).chosen.as_deref()), (true, Some("claude")));
    assert!(choose(&data, "some-other-program").is_err());
    switch(&data, false).unwrap();
    assert_eq!(status(&data).chosen.as_deref(), Some("claude"));
    std::fs::remove_dir_all(data).unwrap();
}

#[test]
fn how_commands_are_handled_is_kept_beside_the_switch_and_the_agent() {
    let data = scratch();
    choose(&data, "claude").unwrap();
    assert_eq!(choose_commands(&data, "automatic").unwrap().commands, Mode::Automatic);
    switch(&data, true).unwrap();
    let found = status(&data);
    assert_eq!((found.on, found.chosen.as_deref(), found.commands), (true, Some("claude"), Mode::Automatic));
    assert_eq!(choose_commands(&data, "refused").unwrap().commands, Mode::Refused);
    assert!(choose_commands(&data, "everything").is_err());
    assert_eq!(status(&data).commands, Mode::Refused);
    std::fs::remove_dir_all(data).unwrap();
}

#[test]
fn nothing_starts_while_the_page_is_off_or_no_agent_is_chosen() {
    let data = scratch();
    let none: OnEvent = Arc::new(|_| ());
    assert!(start(&data, "sample-game", "sample-repo", Arc::clone(&none)).unwrap_err().detail.contains("switched off"));
    switch(&data, true).unwrap();
    assert!(start(&data, "sample-game", "sample-repo", none).unwrap_err().detail.contains("no agent is chosen"));
    std::fs::remove_dir_all(data).unwrap();
}

#[test]
fn without_an_agent_running_every_request_is_refused_in_words() {
    end().unwrap();
    assert!(prompt("Hello").unwrap_err().detail.contains("no agent is running"));
    assert!(prompt("   ").is_err());
    assert!(cancel().is_err());
    assert!(answer_permission("p1", None).is_err());
    assert!(answer_write("w1", true).is_err());
    assert!(answer_command("c1", "run").is_err());
    assert!(answer_command("c1", "always").is_err());
    assert!(allow_for_chat("p1").is_err());
}

#[test]
fn try_it_reads_the_agent_s_name_version_and_ways_to_sign_in_from_its_handshake() {
    let answer = json!({
        "protocolVersion": 1,
        "agentInfo": {"name": "claude-agent-acp", "title": "Claude Agent", "version": "0.9.1"},
        "authMethods": [{"id": "claude-login", "name": "Log in with Claude"}, {"id": "api-key"}],
    });
    let tried = tried_from("Claude (Claude Agent)", &answer);
    assert_eq!(tried.said_name.as_deref(), Some("Claude Agent"));
    assert_eq!(tried.version.as_deref(), Some("0.9.1"));
    assert_eq!(tried.sign_in, vec!["Log in with Claude".to_owned(), "api-key".to_owned()]);
    // An agent that says nothing of itself is named as the list names it.
    let quiet = tried_from("Goose", &json!({"protocolVersion": 1}));
    assert_eq!(quiet, Tried { agent: "Goose".to_owned(), said_name: None, version: None, sign_in: vec![] });
    assert_eq!(serde_json::to_value(&quiet).unwrap()["signIn"], json!([]));
}
