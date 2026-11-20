use super::*;
use crate::kit::Progress;
use serde_json::json;
use std::io::Cursor;
use std::sync::Arc;

/// Where a stand-in command's requests go, to be read back by the test.
#[derive(Clone, Default)]
struct Written(Arc<Mutex<Vec<u8>>>);

impl Write for Written {
    fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        lock(&self.0).extend_from_slice(bytes);
        Ok(bytes.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

impl Written {
    fn lines(&self) -> Vec<Value> {
        String::from_utf8(lock(&self.0).clone())
            .unwrap()
            .lines()
            .map(|line| serde_json::from_str(line).unwrap())
            .collect()
    }
}

/// A stand-in for a serving command: what it will write on standard output and on standard error, all at once.
fn stand_in(output: &str, errors: &str) -> (Served, Written) {
    let written = Written::default();
    let served = Served::from_parts(
        None,
        Box::new(written.clone()),
        Cursor::new(output.to_owned().into_bytes()),
        Cursor::new(errors.to_owned().into_bytes()),
    );
    (served, written)
}

const SOON: Duration = Duration::from_secs(10);

#[test]
fn a_line_is_the_answer_only_when_it_repeats_the_requests_id() {
    assert_eq!(
        sort_line(r#"{"ok": true, "id": 2, "data": {}}"#, Some(2)),
        Some(Reply::Answer(json!({"ok": true, "id": 2, "data": {}})))
    );
    assert_eq!(sort_line(r#"{"ok": true, "id": 1}"#, Some(2)), None);
    assert_eq!(sort_line(r#"{"ok": true}"#, Some(2)), None);
    assert_eq!(sort_line("Traceback (most recent call last):", Some(2)), None);
    assert_eq!(sort_line("[1, 2]", None), None);
    assert_eq!(sort_line(r#"{"ready": true, "pid": 7}"#, None), Some(Reply::Answer(json!({"ready": true, "pid": 7}))));
}

#[test]
fn word_that_it_let_go_settles_any_wait() {
    let line = r#"{"event": "released", "reason": "held for its limit of 600 s"}"#;
    assert_eq!(sort_line(line, Some(9)), Some(Reply::Released("held for its limit of 600 s".to_owned())));
    assert_eq!(sort_line(line, None), Some(Reply::Released("held for its limit of 600 s".to_owned())));
}

#[test]
fn the_first_line_says_whether_it_is_ready() {
    let (served, _) = stand_in("{\"ready\": false, \"error\": \"The game is not running.\"}\n", "");
    assert_eq!(served.first(None, SOON), Reply::Answer(json!({"ready": false, "error": "The game is not running."})));
}

#[test]
fn each_request_gets_the_next_id_and_waits_for_the_line_that_repeats_it() {
    let output = concat!(
        "{\"ready\": true}\n",
        "{\"ok\": true, \"id\": 1, \"data\": {\"totalObjects\": 3}}\n",
        "not json at all\n",
        "{\"ok\": true, \"id\": 7, \"data\": {}}\n",
        "{\"ok\": false, \"id\": 2, \"error\": \"There is no object at 0x10 in this snapshot.\"}\n",
    );
    let (served, written) = stand_in(output, "");
    assert!(matches!(served.first(None, SOON), Reply::Answer(_)));
    let first = served.ask(&json!({"op": "overview"}), None, Some(Instant::now() + SOON));
    assert_eq!(first, Reply::Answer(json!({"ok": true, "id": 1, "data": {"totalObjects": 3}})));
    let second = served.ask(&json!({"op": "object", "address": "0x10"}), None, Some(Instant::now() + SOON));
    assert_eq!(
        second,
        Reply::Answer(json!({"ok": false, "id": 2, "error": "There is no object at 0x10 in this snapshot."}))
    );
    assert_eq!(
        written.lines(),
        [json!({"op": "overview", "id": 1}), json!({"op": "object", "address": "0x10", "id": 2})]
    );
}

#[test]
fn the_end_of_its_output_is_the_end_with_what_it_said() {
    let (served, _) = stand_in("{\"ready\": true}\n", "Traceback: the reader stopped\n");
    assert!(matches!(served.first(None, SOON), Reply::Answer(_)));
    // Both pipes are read on their own threads: the words may come before or after the end of the output.
    match served.ask(&json!({"op": "info"}), None, Some(Instant::now() + SOON)) {
        Reply::Ended(_) => {}
        other => panic!("expected the end, got {other:?}"),
    }
}

#[test]
fn progress_goes_to_the_listener_and_other_words_are_kept_for_a_failure() {
    let (served, _) = stand_in("", "");
    let heard = Mutex::new(Vec::<Progress>::new());
    let listener = |progress: Progress| lock(&heard).push(progress);
    let line = "{\"progress\": 1, \"label\": \"Reading every object\", \"step\": 1048576, \"of\": 28000000}\n";
    assert_eq!(served.step(Heard::Err(line.to_owned()), Some(1), Some(&listener)), None);
    assert_eq!(served.step(Heard::Err("a warning from the reader\n".to_owned()), Some(1), Some(&listener)), None);
    assert_eq!(served.step(Heard::Out("{\"ok\": true, \"id\": 0}".to_owned()), Some(1), Some(&listener)), None);
    assert_eq!(lock(&heard).len(), 1);
    assert_eq!(lock(&heard)[0].label.as_deref(), Some("Reading every object"));
    assert_eq!(served.step(Heard::OutEnded, Some(1), None), Some(Reply::Ended("a warning from the reader".to_owned())));
}

#[test]
fn only_the_latest_words_are_kept() {
    let (served, _) = stand_in("", "");
    for _ in 0..100 {
        served.step(Heard::Err(format!("{}\n", "é".repeat(60))), None, None);
    }
    assert!(served.said().len() <= SAID_KEPT);
}

#[test]
fn a_wait_ends_at_the_time_given() {
    let (reader, writer) = std::io::pipe().unwrap();
    let written = Written::default();
    let served = Served::from_parts(None, Box::new(written), reader, Cursor::new(Vec::new()));
    let reply =
        served.ask(&json!({"op": "why", "type": "A.B"}), None, Some(Instant::now() + Duration::from_millis(50)));
    assert_eq!(reply, Reply::TimedOut);
    drop(writer);
}

#[test]
fn after_a_close_nothing_more_is_written() {
    let (reader, _writer) = std::io::pipe().unwrap();
    let served = Served::from_parts(None, Box::new(Written::default()), reader, Cursor::new(Vec::new()));
    served.close(Duration::ZERO);
    served.close(Duration::ZERO);
    assert!(matches!(served.ask(&json!({"op": "info"}), None, None), Reply::Ended(_)));
    assert!(!served.running());
}
