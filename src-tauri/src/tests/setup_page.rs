use super::*;

fn folder(name: &str) -> std::path::PathBuf {
    let folder = std::env::temp_dir().join(format!("companion-setup-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&folder);
    std::fs::create_dir_all(&folder).expect("a folder to keep in");
    folder
}

#[test]
fn what_the_person_set_aside_is_kept_whole_in_order_and_each_once() {
    let data = folder("kept");
    assert!(kept(&data).is_empty());
    keep(&data, &["steam".to_owned(), "git".to_owned(), "steam".to_owned()]).unwrap();
    assert_eq!(kept(&data), vec!["git".to_owned(), "steam".to_owned()]);
    let text = std::fs::read_to_string(data.join(KEPT_FILE)).unwrap();
    assert!(text.contains("\"version\": 1") && text.contains("setAside"), "{text}");
    // A file that is not ours to read gives nothing set aside, never a failure.
    std::fs::write(data.join(KEPT_FILE), "not json").unwrap();
    assert!(kept(&data).is_empty());
    let _ = std::fs::remove_dir_all(&data);
}

#[test]
fn a_repository_says_which_starter_files_it_has() {
    let root = folder("readiness");
    std::fs::create_dir_all(root.join(".git")).unwrap();
    std::fs::write(root.join("CHANGELOG.md"), "# Changelog\n").unwrap();
    let game = games::Game {
        id: "first".to_owned(),
        name: "First".to_owned(),
        repositories: vec![games::Repository { name: "mods".to_owned(), path: root.clone() }],
        kind: games::GameKind::Game,
    };
    let ready = readiness(&game, &game.repositories[0]);
    assert!(ready.found && ready.git);
    let present: Vec<(&str, bool)> = ready.starters.iter().map(|s| (s.starter.id.as_str(), s.present)).collect();
    assert_eq!(present, [("changelog", true), ("open-work", false), ("decisions", false)]);
    let value = serde_json::to_value(&ready).unwrap();
    // The folder stays with the host; each starter is sent whole, for the window to show before writing.
    assert!(value.get("path").is_none());
    assert_eq!(value["gameName"], "First");
    assert_eq!(value["starters"][1]["path"], "docs/development/outstanding-work.md");
    assert!(value["starters"][1]["content"].as_str().unwrap().contains("| Item | Status |"));
    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn a_key_is_set_aside_once_and_taken_back() {
    let keys = with_key(vec!["git".to_owned()], "steam", true);
    assert_eq!(keys, vec!["git".to_owned(), "steam".to_owned()]);
    assert_eq!(with_key(keys.clone(), "steam", true), keys);
    assert_eq!(with_key(keys, "git", false), vec!["steam".to_owned()]);
}

#[test]
fn a_fetch_is_shown_with_its_command_its_tidied_output_and_how_it_ended() {
    let python = if cfg!(windows) { "python" } else { "python3" };
    let (tell, hear) = std::sync::mpsc::channel();
    let terminal = terminals::start(
        python,
        &["-c".to_owned(), "import sys; sys.stdout.write('one\\rtwo\\n'); sys.exit(4)".to_owned()],
        &std::env::temp_dir(),
        &[],
        terminals::DEFAULT_OUTPUT,
        move |_, _, _| {
            let _ = tell.send(());
        },
    )
    .expect("python is on the search path");
    let run = Run { key: "git".to_owned(), name: "git".to_owned(), command: "winget install".to_owned(), terminal };
    run.terminal.wait();
    hear.recv_timeout(std::time::Duration::from_secs(20)).expect("its end is told");
    let shown = shown(&run);
    assert_eq!(shown.output, "two");
    assert_eq!(shown.ended, Some(Exit { exit_code: Some(4), signal: None }));
    let value = serde_json::to_value(&shown).unwrap();
    assert_eq!(value["command"], "winget install");
    assert_eq!(value["ended"]["exitCode"], 4);
}
