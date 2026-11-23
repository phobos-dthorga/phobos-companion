use super::*;
use std::io::{BufReader, LineWriter};
use std::sync::atomic::AtomicUsize;

static NEXT: AtomicUsize = AtomicUsize::new(0);

fn scratch() -> PathBuf {
    let folder = std::env::temp_dir().join(format!(
        "companion-acp-{}-{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::SeqCst)
    ));
    std::fs::create_dir_all(folder.join("src")).unwrap();
    folder
}

const SECOND: Duration = Duration::from_secs(5);

/// A stand-in agent on in-memory pipes: it reads what the client writes, and the test writes its answers.
struct StandIn {
    client: Arc<Client>,
    heard: Arc<Mutex<Vec<Event>>>,
    from_client: BufReader<std::io::PipeReader>,
    to_client: LineWriter<std::io::PipeWriter>,
}

impl StandIn {
    fn new(root: &Path) -> Self {
        let (from_agent, to_client) = std::io::pipe().unwrap();
        let (from_client, to_agent) = std::io::pipe().unwrap();
        let heard = Arc::new(Mutex::new(Vec::new()));
        let keep = Arc::clone(&heard);
        let client =
            Client::start(BufReader::new(from_agent), to_agent, root, Arc::new(move |e| keep.lock().unwrap().push(e)));
        Self { client, heard, from_client: BufReader::new(from_client), to_client: LineWriter::new(to_client) }
    }

    /// The next message the client wrote.
    fn read(&mut self) -> Value {
        let mut line = String::new();
        self.from_client.read_line(&mut line).unwrap();
        serde_json::from_str(&line).unwrap()
    }

    fn write(&mut self, message: Value) {
        writeln!(self.to_client, "{message}").unwrap();
    }

    fn heard(&self) -> Vec<Event> {
        self.heard.lock().unwrap().clone()
    }

    /// What the client heard, once it has heard at least `count` events (waiting up to two seconds for its reading thread).
    fn heard_at_least(&self, count: usize) -> Vec<Event> {
        for _ in 0..200 {
            let heard = self.heard();
            if heard.len() >= count {
                return heard;
            }
            std::thread::sleep(Duration::from_millis(10));
        }
        self.heard()
    }
}

/// Runs a request on a thread of its own, as the host does, so the stand-in can answer it.
fn asking<T: Send + 'static>(
    client: &Arc<Client>,
    work: impl FnOnce(&Client) -> T + Send + 'static,
) -> std::thread::JoinHandle<T> {
    let client = Arc::clone(client);
    std::thread::spawn(move || work(&client))
}

#[test]
fn the_shipped_agents_are_all_startable_by_name() {
    let found = checked_agents(AGENTS).unwrap();
    assert!(found.len() >= 3);
    assert!(found.iter().all(|a| !a.command.contains(['/', '\\', ' '])));
    assert!(found.iter().all(|a| a.command != "npx"), "the Companion never installs an agent");
}

#[test]
fn an_agent_file_that_names_a_path_or_odd_arguments_is_refused() {
    let one = |agent: &str| format!("{{\"agents\": [{agent}]}}");
    assert!(checked_agents(&one(r#"{"id":"x","name":"X","command":"C:\\x.exe","args":[],"get":""}"#)).is_err());
    assert!(checked_agents(&one(r#"{"id":"x","name":"X","command":"x y","args":[],"get":""}"#)).is_err());
    assert!(checked_agents(&one(r#"{"id":"x","name":"X","command":"x","args":["a\nb"],"get":""}"#)).is_err());
    assert!(checked_agents(&one(r#"{"id":"x","name":"X","command":"x-acp","args":["--acp"],"get":""}"#)).is_ok());
}

#[test]
fn a_program_is_found_by_name_with_windows_endings() {
    let folder = scratch();
    std::fs::write(folder.join("sample-acp.cmd"), "").unwrap();
    let path = folder.as_os_str().to_owned();
    assert_eq!(find_program("sample-acp", Some(&path), Some(".EXE;.CMD")), Some(folder.join("sample-acp.cmd")));
    assert_eq!(find_program("other-acp", Some(&path), Some(".EXE;.CMD")), None);
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
fn the_handshake_offers_reading_only_and_a_conversation_starts_in_the_repository() {
    let root = scratch();
    let mut agent = StandIn::new(&root);
    let started = asking(&agent.client, |c| c.initialize("0.74.0", SECOND));
    let asked = agent.read();
    assert_eq!(asked["method"], "initialize");
    assert_eq!(asked["params"]["protocolVersion"], 1);
    assert_eq!(
        asked["params"]["clientCapabilities"],
        json!({"fs": {"readTextFile": true, "writeTextFile": false}, "terminal": false})
    );
    agent.write(json!({"jsonrpc": "2.0", "id": asked["id"], "result": {"protocolVersion": 1, "authMethods": []}}));
    assert!(started.join().unwrap().is_ok());
    let root_seen = root.clone();
    let session = asking(&agent.client, move |c| c.new_session(&root_seen, vec![], SECOND));
    let asked = agent.read();
    assert_eq!((asked["method"].as_str(), asked["params"]["mcpServers"].clone()), (Some("session/new"), json!([])));
    agent.write(json!({"jsonrpc": "2.0", "id": asked["id"], "result": {"sessionId": "sess_1"}}));
    assert_eq!(session.join().unwrap().unwrap(), "sess_1");
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn a_newer_protocol_or_a_login_wanted_is_said_in_words() {
    let root = scratch();
    let mut agent = StandIn::new(&root);
    let started = asking(&agent.client, |c| c.initialize("0.74.0", SECOND));
    let asked = agent.read();
    agent.write(json!({"jsonrpc": "2.0", "id": asked["id"], "result": {"protocolVersion": 2}}));
    assert!(started.join().unwrap().unwrap_err().contains("version 2"));
    let root_seen = root.clone();
    let session = asking(&agent.client, move |c| c.new_session(&root_seen, vec![], SECOND));
    let asked = agent.read();
    agent.write(
        json!({"jsonrpc": "2.0", "id": asked["id"], "error": {"code": -32000, "message": "Authentication required"}}),
    );
    assert!(session.join().unwrap().unwrap_err().contains("log in"));
    std::fs::remove_dir_all(root).unwrap();
}

fn started(root: &Path) -> StandIn {
    let mut agent = StandIn::new(root);
    let root_seen = root.to_path_buf();
    let session = asking(&agent.client, move |c| c.new_session(&root_seen, vec![], SECOND));
    let asked = agent.read();
    agent.write(json!({"jsonrpc": "2.0", "id": asked["id"], "result": {"sessionId": "sess_1"}}));
    session.join().unwrap().unwrap();
    agent
}

#[test]
fn a_turn_streams_its_text_steps_and_plan_then_ends() {
    let root = scratch();
    let mut agent = started(&root);
    let turn = asking(&agent.client, |c| c.prompt("Why did my save fail?", SECOND));
    let asked = agent.read();
    assert_eq!(
        asked["params"],
        json!({"sessionId": "sess_1", "prompt": [{"type": "text", "text": "Why did my save fail?"}]})
    );
    let update = |u: Value| json!({"jsonrpc": "2.0", "method": "session/update", "params": {"sessionId": "sess_1", "update": u}});
    agent.write(update(
        json!({"sessionUpdate": "agent_thought_chunk", "content": {"type": "text", "text": "Looking."}}),
    ));
    agent.write(update(json!({"sessionUpdate": "tool_call", "toolCallId": "t1", "title": "Read Player.log", "kind": "read", "status": "pending"})));
    agent.write(update(json!({"sessionUpdate": "tool_call_update", "toolCallId": "t1", "status": "completed"})));
    agent.write(update(json!({"sessionUpdate": "plan", "entries": [{"content": "Read the log", "priority": "high", "status": "completed"}]})));
    agent.write(update(
        json!({"sessionUpdate": "agent_message_chunk", "content": {"type": "text", "text": "A mod failed."}}),
    ));
    agent.write(update(json!({"sessionUpdate": "something_new", "anything": 1})));
    agent.write(json!({"jsonrpc": "2.0", "id": asked["id"], "result": {"stopReason": "end_turn"}}));
    assert_eq!(turn.join().unwrap().unwrap(), "end_turn");
    let heard = agent.heard();
    assert_eq!(heard[0], Event::Text { role: "thought".into(), text: "Looking.".into() });
    assert_eq!(
        heard[1],
        Event::Tool {
            id: "t1".into(),
            title: Some("Read Player.log".into()),
            tool: Some("read".into()),
            status: Some("pending".into())
        }
    );
    assert_eq!(heard[2], Event::Tool { id: "t1".into(), title: None, tool: None, status: Some("completed".into()) });
    assert_eq!(
        heard[3],
        Event::Plan { entries: vec![PlanEntry { content: "Read the log".into(), status: "completed".into() }] }
    );
    assert_eq!(heard[4], Event::Text { role: "agent".into(), text: "A mod failed.".into() });
    assert_eq!(heard.len(), 5, "an update the Companion does not know is passed over");
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn a_file_inside_the_repository_is_read_and_shown_one_outside_is_refused() {
    let root = scratch();
    std::fs::write(root.join("src").join("Boat.cs"), "line one\nline two\nline three\n").unwrap();
    let outside = std::env::temp_dir().join(format!("companion-acp-outside-{}.txt", std::process::id()));
    std::fs::write(&outside, "secret").unwrap();
    let mut agent = started(&root);
    let file = root.canonicalize().unwrap().join("src").join("Boat.cs");
    agent.write(json!({"jsonrpc": "2.0", "id": 7, "method": "fs/read_text_file",
                       "params": {"sessionId": "sess_1", "path": file, "line": 2, "limit": 1}}));
    assert_eq!(agent.read(), json!({"jsonrpc": "2.0", "id": 7, "result": {"content": "line two"}}));
    agent.write(json!({"jsonrpc": "2.0", "id": 8, "method": "fs/read_text_file", "params": {"sessionId": "sess_1", "path": outside}}));
    let refused = agent.read();
    assert!(refused["error"]["message"].as_str().unwrap().contains("outside the repository"));
    agent.write(json!({"jsonrpc": "2.0", "id": 9, "method": "fs/read_text_file", "params": {"sessionId": "sess_1", "path": "src/Boat.cs"}}));
    assert!(agent.read().get("error").is_some(), "a relative path is refused");
    let heard = agent.heard_at_least(2);
    assert_eq!(heard[0], Event::Read { path: "src/Boat.cs".into(), allowed: true, reason: None });
    assert!(matches!(&heard[1], Event::Read { allowed: false, .. }));
    std::fs::remove_file(outside).unwrap();
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn a_write_or_a_command_through_the_companion_is_refused_and_shown() {
    let root = scratch();
    let mut agent = started(&root);
    let target = root.canonicalize().unwrap().join("src").join("New.cs");
    agent.write(json!({"jsonrpc": "2.0", "id": "w1", "method": "fs/write_text_file",
                       "params": {"sessionId": "sess_1", "path": target, "content": "x"}}));
    let answer = agent.read();
    assert_eq!((answer["id"].as_str(), answer["error"]["code"].as_i64()), (Some("w1"), Some(-32601)));
    agent.write(json!({"jsonrpc": "2.0", "id": 2, "method": "terminal/create", "params": {"command": "rm"}}));
    assert!(agent.read().get("error").is_some());
    assert!(!target.exists());
    assert_eq!(
        agent.heard_at_least(2),
        [Event::Refused { what: "fs/write_text_file".into() }, Event::Refused { what: "terminal/create".into() }]
    );
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn a_permission_is_answered_only_with_an_offered_option() {
    let root = scratch();
    let mut agent = started(&root);
    agent.write(json!({"jsonrpc": "2.0", "id": 21, "method": "session/request_permission", "params": {
        "sessionId": "sess_1",
        "toolCall": {"toolCallId": "t2", "title": "Edit Boat.cs"},
        "options": [{"optionId": "allow-once", "name": "Allow once", "kind": "allow_once"},
                    {"optionId": "reject-once", "name": "Reject", "kind": "reject_once"}]}}));
    let Some(Event::Permission { request, title, options }) = agent.heard_at_least(1).pop() else {
        panic!("it should ask the person")
    };
    assert_eq!((title.as_str(), options.len()), ("Edit Boat.cs", 2));
    assert!(agent.client.answer_permission(&request, Some("allow-always")).is_err(), "not offered");
    agent.client.answer_permission(&request, Some("reject-once")).unwrap();
    assert_eq!(
        agent.read(),
        json!({"jsonrpc": "2.0", "id": 21, "result": {"outcome": {"outcome": "selected", "optionId": "reject-once"}}})
    );
    assert!(agent.client.answer_permission(&request, None).is_err(), "answered once only");
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn stopping_tells_the_agent_and_cancels_every_permission_waiting() {
    let root = scratch();
    let mut agent = started(&root);
    agent.write(json!({"jsonrpc": "2.0", "id": 31, "method": "session/request_permission", "params": {
        "sessionId": "sess_1", "toolCall": {"toolCallId": "t3"},
        "options": [{"optionId": "allow-once", "name": "Allow once", "kind": "allow_once"}]}}));
    assert_eq!(agent.heard_at_least(1).len(), 1);
    agent.client.cancel();
    assert_eq!(agent.read(), json!({"jsonrpc": "2.0", "method": "session/cancel", "params": {"sessionId": "sess_1"}}));
    assert_eq!(agent.read(), json!({"jsonrpc": "2.0", "id": 31, "result": {"outcome": {"outcome": "cancelled"}}}));
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn when_the_agent_ends_every_request_waiting_ends_too() {
    let root = scratch();
    let agent = StandIn::new(&root);
    let started = asking(&agent.client, |c| c.initialize("0.74.0", SECOND));
    let StandIn { to_client, heard, .. } = agent;
    drop(to_client);
    assert!(started.join().unwrap().unwrap_err().contains("ended"));
    for _ in 0..200 {
        if matches!(heard.lock().unwrap().last(), Some(Event::Ended { .. })) {
            break;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    assert!(matches!(heard.lock().unwrap().last(), Some(Event::Ended { .. })));
    std::fs::remove_dir_all(root).unwrap();
}
