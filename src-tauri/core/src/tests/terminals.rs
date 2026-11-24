use super::*;

fn python() -> &'static str {
    if cfg!(windows) { "python" } else { "python3" }
}

fn run(code: &str, limit: usize) -> (Arc<Terminal>, mpsc::Receiver<(Exit, String, bool)>) {
    let (tell, hear) = mpsc::channel();
    let terminal = start(
        python(),
        &["-c".to_owned(), code.to_owned()],
        &std::env::temp_dir(),
        // UTF-8 on every system: Python writes to a pipe in Windows' own code page otherwise.
        &[("COMPANION_TEST".to_owned(), "seen".to_owned()), ("PYTHONIOENCODING".to_owned(), "utf-8".to_owned())],
        limit,
        move |exit, tail, truncated| {
            let _ = tell.send((exit, tail, truncated));
        },
    )
    .expect("python is on the search path");
    (terminal, hear)
}

#[test]
fn a_command_runs_in_its_folder_and_its_output_and_errors_are_kept_together() {
    let (terminal, ended) = run(
        "import os, sys; print(os.environ['COMPANION_TEST']); print('oops', file=sys.stderr); sys.exit(3)",
        DEFAULT_OUTPUT,
    );
    assert_eq!(terminal.wait(), Exit { exit_code: Some(3), signal: None });
    let (exit, tail, truncated) = ended.recv_timeout(Duration::from_secs(10)).unwrap();
    assert_eq!(exit.exit_code, Some(3));
    assert!(tail.contains("seen") && tail.contains("oops"), "{tail}");
    assert!(!truncated);
    let output = terminal.output();
    assert_eq!(output.exit.unwrap().exit_code, Some(3));
    assert!(output.text.contains("seen"));
}

#[test]
fn output_past_the_limit_drops_the_oldest_at_a_characters_edge() {
    let (terminal, _) = run("print('é' * 5000 + 'END')", 1001);
    terminal.wait();
    let output = terminal.output();
    assert!(output.truncated);
    assert!(output.text.len() <= 1001);
    assert!(output.text.trim_end().ends_with("END"), "the newest is kept");
    assert!(output.text.starts_with('é'), "never half a character");
}

#[test]
fn a_command_is_killed_with_what_it_started() {
    let (terminal, ended) = run("import time; time.sleep(60)", DEFAULT_OUTPUT);
    std::thread::sleep(Duration::from_millis(300));
    assert!(terminal.output().exit.is_none(), "still running");
    terminal.kill();
    let (exit, _, _) = ended.recv_timeout(Duration::from_secs(10)).expect("it ends once killed");
    assert_ne!(exit.exit_code, Some(0));
}

#[test]
fn a_program_that_is_not_there_says_so() {
    let refused = start("no-such-program-anywhere", &[], &std::env::temp_dir(), &[], DEFAULT_OUTPUT, |_, _, _| {});
    assert!(refused.err().unwrap().contains("could not be started"));
}
