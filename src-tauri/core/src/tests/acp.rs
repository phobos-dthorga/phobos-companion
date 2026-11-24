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
        Self::with(root, Policy::refused())
    }

    /// A stand-in whose commands are handled as `policy` says (0.84.0).
    fn with(root: &Path, policy: Policy) -> Self {
        let (from_agent, to_client) = std::io::pipe().unwrap();
        let (from_client, to_agent) = std::io::pipe().unwrap();
        let heard = Arc::new(Mutex::new(Vec::new()));
        let keep = Arc::clone(&heard);
        let client = Client::start_with(
            BufReader::new(from_agent),
            to_agent,
            root,
            Arc::new(move |e| keep.lock().unwrap().push(e)),
            policy,
        );
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
        json!({"fs": {"readTextFile": true, "writeTextFile": true}, "terminal": false})
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
fn a_command_through_the_companion_is_refused_and_shown() {
    let root = scratch();
    let mut agent = started(&root);
    agent.write(json!({"jsonrpc": "2.0", "id": 2, "method": "terminal/create", "params": {"command": "rm"}}));
    let answer = agent.read();
    assert_eq!(answer["error"]["code"].as_i64(), Some(-32601));
    assert_eq!(agent.heard_at_least(1), [Event::Refused { what: "terminal/create".into() }]);
    std::fs::remove_dir_all(root).unwrap();
}

fn ask_to_write(agent: &mut StandIn, id: u64, path: &Path, content: &str) {
    agent.write(json!({"jsonrpc": "2.0", "id": id, "method": "fs/write_text_file",
                       "params": {"sessionId": "sess_1", "path": path, "content": content}}));
}

#[test]
fn a_write_waits_for_a_yes_shows_what_is_there_and_then_writes() {
    let root = scratch();
    std::fs::write(root.join("src").join("Boat.cs"), "old line\n").unwrap();
    let mut agent = started(&root);
    let file = root.canonicalize().unwrap().join("src").join("Boat.cs");
    ask_to_write(&mut agent, 41, &file, "new line\n");
    let Some(Event::Write { request, path, before, after }) = agent.heard_at_least(1).pop() else {
        panic!("it should wait for the person")
    };
    assert_eq!((path.as_str(), before.as_deref(), after.as_str()), ("src/Boat.cs", Some("old line\n"), "new line\n"));
    assert_eq!(std::fs::read_to_string(&file).unwrap(), "old line\n", "nothing is written before the yes");
    agent.client.answer_write(&request, true).unwrap();
    assert_eq!(agent.read(), json!({"jsonrpc": "2.0", "id": 41, "result": {}}));
    assert_eq!(std::fs::read_to_string(&file).unwrap(), "new line\n");
    assert_eq!(
        agent.heard_at_least(2).pop(),
        Some(Event::Written { path: "src/Boat.cs".into(), written: true, reason: None })
    );
    assert!(agent.client.answer_write(&request, true).is_err(), "answered once only");
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn a_new_file_in_a_new_folder_is_made_on_a_yes() {
    let root = scratch();
    let mut agent = started(&root);
    let file = root.canonicalize().unwrap().join("docs").join("notes").join("New.md");
    ask_to_write(&mut agent, 42, &file, "Hello");
    let Some(Event::Write { request, path, before, .. }) = agent.heard_at_least(1).pop() else {
        panic!("it should wait")
    };
    assert_eq!((path.as_str(), before), ("docs/notes/New.md", None));
    agent.client.answer_write(&request, true).unwrap();
    assert_eq!(agent.read()["result"], json!({}));
    assert_eq!(std::fs::read_to_string(&file).unwrap(), "Hello");
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn a_no_leaves_the_file_as_it_was_and_tells_the_agent() {
    let root = scratch();
    std::fs::write(root.join("src").join("Boat.cs"), "old line\n").unwrap();
    let mut agent = started(&root);
    let file = root.canonicalize().unwrap().join("src").join("Boat.cs");
    ask_to_write(&mut agent, 43, &file, "new line\n");
    let Some(Event::Write { request, .. }) = agent.heard_at_least(1).pop() else { panic!("it should wait") };
    agent.client.answer_write(&request, false).unwrap();
    let answer = agent.read();
    assert!(answer["error"]["message"].as_str().unwrap().contains("chose not to make this change"));
    assert_eq!(std::fs::read_to_string(&file).unwrap(), "old line\n");
    assert_eq!(
        agent.heard_at_least(2).pop(),
        Some(Event::Written { path: "src/Boat.cs".into(), written: false, reason: None })
    );
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn a_write_outside_the_repository_or_into_git_is_refused_at_once() {
    let root = scratch();
    std::fs::create_dir_all(root.join(".git")).unwrap();
    let outside = std::env::temp_dir().join(format!("companion-acp-write-outside-{}.txt", std::process::id()));
    let mut agent = started(&root);
    ask_to_write(&mut agent, 44, &outside, "x");
    assert!(agent.read()["error"]["message"].as_str().unwrap().contains("outside the repository"));
    let git = root.canonicalize().unwrap().join(".git").join("config");
    ask_to_write(&mut agent, 45, &git, "x");
    assert!(agent.read()["error"]["message"].as_str().unwrap().contains("git's own folder"));
    agent.write(json!({"jsonrpc": "2.0", "id": 46, "method": "fs/write_text_file",
                       "params": {"sessionId": "sess_1", "path": "src/Relative.cs", "content": "x"}}));
    assert!(agent.read().get("error").is_some(), "a relative path is refused");
    assert!(!outside.exists() && !git.exists());
    let heard = agent.heard_at_least(3);
    assert!(heard.iter().all(|e| matches!(e, Event::Written { written: false, reason: Some(_), .. })));
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn stopping_declines_every_write_waiting() {
    let root = scratch();
    let mut agent = started(&root);
    let file = root.canonicalize().unwrap().join("src").join("Waiting.cs");
    ask_to_write(&mut agent, 47, &file, "x");
    assert_eq!(agent.heard_at_least(1).len(), 1);
    agent.client.cancel();
    assert_eq!(agent.read()["method"], "session/cancel");
    assert!(agent.read()["error"]["message"].as_str().unwrap().contains("chose not to make this change"));
    assert!(!file.exists());
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn a_write_target_is_inside_the_root_and_never_a_folder() {
    let root = scratch().canonicalize().unwrap();
    std::fs::create_dir_all(root.join(".git")).unwrap();
    let ok = write_target(&root, &root.join("src").join("A.cs").to_string_lossy()).unwrap();
    assert_eq!(ok, ("src/A.cs".to_owned(), root.join("src").join("A.cs")));
    assert!(write_target(&root, &root.join("src").to_string_lossy()).is_err(), "a folder");
    assert!(write_target(&root, &root.join(".GIT").join("HEAD").to_string_lossy()).is_err(), "git, in any case");
    assert!(write_target(&root, &format!("{}/src/../../x", root.to_string_lossy())).is_err(), "a step up");
    assert!(write_target(&root, "").is_err());
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
    let Some(Event::Permission { request, title, options, command, .. }) = agent.heard_at_least(1).pop() else {
        panic!("it should ask the person")
    };
    assert_eq!((title.as_str(), options.len(), command), ("Edit Boat.cs", 2, None));
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

// ---------------------------------------------------------------- commands (0.84.0)

fn in_mode(root: &Path, mode: Mode) -> StandIn {
    let mut agent = StandIn::with(root, Policy { mode, kit: KitEffects::new() });
    let root_seen = root.to_path_buf();
    let session = asking(&agent.client, move |c| c.new_session(&root_seen, vec![], SECOND));
    let asked = agent.read();
    agent.write(json!({"jsonrpc": "2.0", "id": asked["id"], "result": {"sessionId": "sess_1"}}));
    session.join().unwrap().unwrap();
    agent
}

fn python() -> &'static str {
    if cfg!(windows) { "python" } else { "python3" }
}

/// The last event of a kind the client heard, waiting for it up to a few seconds.
fn last_heard(agent: &StandIn, wanted: impl Fn(&Event) -> bool) -> Event {
    for _ in 0..500 {
        if let Some(found) = agent.heard().into_iter().rev().find(|e| wanted(e)) {
            return found;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    panic!("not heard: {:?}", agent.heard());
}

fn create(agent: &mut StandIn, id: u64, command: &str, args: &[&str]) {
    agent.write(json!({"jsonrpc": "2.0", "id": id, "method": "terminal/create",
        "params": {"sessionId": "sess_1", "command": command, "args": args}}));
}

#[test]
fn a_terminal_is_offered_unless_commands_are_refused() {
    for (mode, offered) in [(Mode::Refused, false), (Mode::Ask, true), (Mode::Automatic, true)] {
        let root = scratch();
        let mut agent = StandIn::with(&root, Policy { mode, kit: KitEffects::new() });
        let started = asking(&agent.client, |c| c.initialize("0.84.0", SECOND));
        let asked = agent.read();
        assert_eq!(asked["params"]["clientCapabilities"]["terminal"], offered, "{mode:?}");
        agent.write(json!({"jsonrpc": "2.0", "id": asked["id"], "result": {"protocolVersion": 1}}));
        started.join().unwrap().unwrap();
        std::fs::remove_dir_all(root).unwrap();
    }
}

#[test]
fn in_automatic_a_reading_command_runs_by_itself_and_its_terminal_answers() {
    let root = scratch();
    let mut agent = in_mode(&root, Mode::Automatic);
    create(&mut agent, 40, "git", &["--version"]);
    let answer = agent.read();
    let terminal = answer["result"]["terminalId"].as_str().expect("a terminal").to_owned();
    let Event::CommandRun { command, how, cwd, why, .. } =
        last_heard(&agent, |e| matches!(e, Event::CommandRun { .. }))
    else {
        unreachable!()
    };
    assert_eq!(
        (command.as_str(), how.as_str(), cwd.as_str(), why),
        ("git --version", "automatic", ".", vec!["reads".to_owned()])
    );
    agent.write(json!({"jsonrpc": "2.0", "id": 41, "method": "terminal/wait_for_exit",
        "params": {"sessionId": "sess_1", "terminalId": terminal}}));
    assert_eq!(agent.read(), json!({"jsonrpc": "2.0", "id": 41, "result": {"exitCode": 0, "signal": null}}));
    agent.write(json!({"jsonrpc": "2.0", "id": 42, "method": "terminal/output",
        "params": {"sessionId": "sess_1", "terminalId": terminal}}));
    let output = agent.read();
    assert!(output["result"]["output"].as_str().unwrap().contains("git version"), "{output}");
    assert_eq!(output["result"]["exitStatus"]["exitCode"], 0);
    let Event::CommandEnded { code, tail, .. } = last_heard(&agent, |e| matches!(e, Event::CommandEnded { .. })) else {
        unreachable!()
    };
    assert_eq!(code, Some(0));
    assert!(tail.contains("git version"));
    agent.write(json!({"jsonrpc": "2.0", "id": 43, "method": "terminal/release",
        "params": {"sessionId": "sess_1", "terminalId": terminal}}));
    assert_eq!(agent.read()["result"], json!({}));
    agent.write(json!({"jsonrpc": "2.0", "id": 44, "method": "terminal/output",
        "params": {"sessionId": "sess_1", "terminalId": terminal}}));
    assert!(agent.read()["error"]["message"].as_str().unwrap().contains("no such terminal"));
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn in_ask_a_command_waits_for_the_press_and_for_this_chat_runs_by_itself_after() {
    let root = scratch();
    let mut agent = in_mode(&root, Mode::Ask);
    create(&mut agent, 50, "git", &["--version"]);
    let Event::CommandAsk { request, command, why, warn, .. } =
        last_heard(&agent, |e| matches!(e, Event::CommandAsk { .. }))
    else {
        unreachable!()
    };
    assert_eq!(
        (command.as_str(), why, warn),
        ("git --version", vec!["reads".to_owned()], false),
        "it only reads, and still asks"
    );
    agent.client.answer_command(&request, CommandAnswer::ForChat).unwrap();
    assert!(agent.read()["result"]["terminalId"].is_string());
    assert!(agent.client.answer_command(&request, CommandAnswer::Run).is_err(), "answered once only");
    // The same command again runs by itself, for the rest of this chat.
    create(&mut agent, 51, "git", &["--version"]);
    assert!(agent.read()["result"]["terminalId"].is_string());
    let runs: Vec<String> = agent
        .heard()
        .into_iter()
        .filter_map(|e| if let Event::CommandRun { how, .. } = e { Some(how) } else { None })
        .collect();
    assert_eq!(runs, ["for-chat", "for-chat"]);
    // Both end before their folder is taken away (Windows keeps a folder a program runs in).
    for _ in 0..500 {
        if agent.heard().iter().filter(|e| matches!(e, Event::CommandEnded { .. })).count() == 2 {
            break;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn a_no_tells_the_agent_and_runs_nothing() {
    let root = scratch();
    let mut agent = in_mode(&root, Mode::Automatic);
    create(&mut agent, 60, python(), &["-c", "open('made.txt', 'w').write('x')"]);
    let Event::CommandAsk { request, why, .. } = last_heard(&agent, |e| matches!(e, Event::CommandAsk { .. })) else {
        unreachable!()
    };
    assert_eq!(why, ["runs-script"], "a script asks, even in Automatic");
    agent.client.answer_command(&request, CommandAnswer::No).unwrap();
    assert!(agent.read()["error"]["message"].as_str().unwrap().contains("chose not to run"));
    assert!(!root.join("made.txt").exists());
    assert!(matches!(
        last_heard(&agent, |e| matches!(e, Event::CommandNotRun { .. })),
        Event::CommandNotRun { refused: false, reason: None, .. }
    ));
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn what_is_forbidden_or_outside_the_repository_is_refused_at_once() {
    let root = scratch();
    let mut agent = in_mode(&root, Mode::Automatic);
    create(&mut agent, 70, "git", &["push", "--force"]);
    let answer = agent.read();
    assert!(answer["error"]["message"].as_str().unwrap().contains("force-pushing"), "{answer}");
    assert!(matches!(
        last_heard(&agent, |e| matches!(e, Event::CommandNotRun { .. })),
        Event::CommandNotRun { refused: true, ref why, .. } if why == &["force-push".to_owned()]
    ));
    let outside = std::env::temp_dir().canonicalize().unwrap();
    agent.write(json!({"jsonrpc": "2.0", "id": 71, "method": "terminal/create",
        "params": {"sessionId": "sess_1", "command": "git", "args": ["status"], "cwd": outside}}));
    assert!(agent.read()["error"]["message"].as_str().unwrap().contains("outside the repository"));
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn stop_ends_a_running_command_and_declines_one_waiting() {
    let root = scratch();
    let mut agent = in_mode(&root, Mode::Ask);
    create(&mut agent, 80, python(), &["-c", "import time; time.sleep(60)"]);
    let Event::CommandAsk { request, .. } = last_heard(&agent, |e| matches!(e, Event::CommandAsk { .. })) else {
        unreachable!()
    };
    agent.client.answer_command(&request, CommandAnswer::Run).unwrap();
    assert!(agent.read()["result"]["terminalId"].is_string());
    create(&mut agent, 81, "git", &["--version"]);
    let _ = last_heard(&agent, |e| matches!(e, Event::CommandAsk { command, .. } if command == "git --version"));
    agent.client.cancel();
    assert_eq!(agent.read()["method"], "session/cancel");
    assert!(agent.read()["error"]["message"].as_str().unwrap().contains("chose not to run"));
    let ended = last_heard(&agent, |e| matches!(e, Event::CommandEnded { .. }));
    assert!(matches!(ended, Event::CommandEnded { code, .. } if code != Some(0)), "{ended:?}");
    std::fs::remove_dir_all(root).unwrap();
}

fn ask_permission(agent: &mut StandIn, id: u64, command: &str) {
    agent.write(json!({"jsonrpc": "2.0", "id": id, "method": "session/request_permission", "params": {
        "sessionId": "sess_1",
        "toolCall": {"toolCallId": format!("t{id}"), "title": format!("`{command}`"), "kind": "execute",
                     "rawInput": {"command": command}},
        "options": [{"optionId": "allow-once", "name": "Allow", "kind": "allow_once"},
                    {"optionId": "allow-always", "name": "Always allow", "kind": "allow_always"},
                    {"optionId": "reject-once", "name": "Reject", "kind": "reject_once"}]}}));
}

#[test]
fn the_agents_own_permission_questions_are_sorted_the_same_way() {
    let root = scratch();
    let mut agent = in_mode(&root, Mode::Automatic);
    ask_permission(&mut agent, 90, "git status");
    assert_eq!(agent.read()["result"]["outcome"], json!({"outcome": "selected", "optionId": "allow-once"}));
    ask_permission(&mut agent, 91, "git push --force");
    assert_eq!(agent.read()["result"]["outcome"], json!({"outcome": "selected", "optionId": "reject-once"}));
    let outcomes: Vec<String> = agent
        .heard()
        .into_iter()
        .filter_map(|e| if let Event::Decided { outcome, .. } = e { Some(outcome) } else { None })
        .collect();
    assert_eq!(outcomes, ["allowed", "refused"]);
    // One that changes something comes to the person, with what it is and why.
    ask_permission(&mut agent, 92, "rm -rf build");
    let Event::Permission { request, command, why, warn, remember, .. } =
        last_heard(&agent, |e| matches!(e, Event::Permission { .. }))
    else {
        unreachable!()
    };
    assert_eq!(
        (command.as_deref(), why, warn, remember),
        (Some("rm -rf build"), vec!["deletes".to_owned()], true, true)
    );
    agent.client.allow_for_chat(&request).unwrap();
    assert_eq!(agent.read()["result"]["outcome"]["optionId"], "allow-once", "the agent's own once, never its always");
    ask_permission(&mut agent, 93, "rm   -rf build");
    assert_eq!(agent.read()["result"]["outcome"]["optionId"], "allow-once");
    assert!(matches!(
        last_heard(&agent, |e| matches!(e, Event::Decided { .. })),
        Event::Decided { ref outcome, .. } if outcome == "for-chat"
    ));
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn with_commands_refused_the_agents_questions_still_come_to_the_person_and_a_forbidden_one_is_answered_no() {
    let root = scratch();
    let mut agent = in_mode(&root, Mode::Refused);
    ask_permission(&mut agent, 95, "git status");
    let Event::Permission { request, remember, .. } = last_heard(&agent, |e| matches!(e, Event::Permission { .. }))
    else {
        unreachable!()
    };
    assert!(!remember, "nothing is allowed for the chat while commands are refused");
    assert!(agent.client.allow_for_chat(&request).is_err());
    ask_permission(&mut agent, 96, "git rebase -i HEAD~2");
    assert_eq!(agent.read()["result"]["outcome"]["optionId"], "reject-once");
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn a_command_is_found_in_the_agents_own_words_or_its_steps_title() {
    assert_eq!(command_of(&json!({"rawInput": {"command": "git status"}})).as_deref(), Some("git status"));
    assert_eq!(
        command_of(&json!({"rawInput": {"command": ["bash", "-lc", "git log -3"]}})).as_deref(),
        Some("bash -lc \"git log -3\"")
    );
    assert_eq!(command_of(&json!({"kind": "execute", "title": "`ls -la`"})).as_deref(), Some("ls -la"));
    assert_eq!(command_of(&json!({"kind": "edit", "title": "Edit Boat.cs"})), None);
}
