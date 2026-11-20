use super::*;
use std::env;
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT: AtomicUsize = AtomicUsize::new(0);

fn scratch() -> PathBuf {
    let folder = env::temp_dir().join(format!(
        "companion-agents-{}-{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::SeqCst)
    ));
    fs::create_dir_all(&folder).unwrap();
    folder
}

#[test]
fn nothing_found_means_hidden_by_default() {
    let root = scratch();
    let repository = root.join("plain-mods");
    let data = root.join("data");
    fs::create_dir_all(repository.join("config")).unwrap();
    fs::write(repository.join("CHANGELOG.md"), "# Changelog\n").unwrap();
    // An empty notes folder is not a sign: the program may have made it and kept nothing.
    fs::create_dir_all(data.join("screen-notes")).unwrap();
    let answer = status(&data, std::slice::from_ref(&repository));
    assert_eq!(answer.choice, Choice::Found);
    assert!(answer.signs.is_empty());
    assert!(!answer.shown);
    fs::remove_dir_all(&root).unwrap();
}

#[test]
fn an_agents_file_or_kept_notes_show_them() {
    let root = scratch();
    let repository = root.join("agent-mods");
    let data = root.join("data");
    fs::create_dir_all(repository.join("config")).unwrap();
    fs::write(repository.join("AGENTS.md"), "# Rules\n").unwrap();
    fs::write(repository.join("config/decisions.json"), "{}").unwrap();
    fs::create_dir_all(data.join("screen-notes").join("one")).unwrap();
    let answer = status(&data, std::slice::from_ref(&repository));
    assert!(answer.shown);
    let found: Vec<(&str, Option<&str>)> =
        answer.signs.iter().map(|s| (s.what.as_str(), s.repository.as_deref())).collect();
    assert_eq!(
        found,
        vec![("AGENTS.md", Some("agent-mods")), ("config/decisions.json", Some("agent-mods")), ("screen-notes", None)]
    );
    fs::remove_dir_all(&root).unwrap();
}

#[test]
fn the_choice_overrides_what_was_found_and_is_kept() {
    let root = scratch();
    let repository = root.join("agent-mods");
    let data = root.join("data");
    fs::create_dir_all(&repository).unwrap();
    fs::write(repository.join("CLAUDE.md"), "@AGENTS.md\n").unwrap();
    let repositories = vec![repository];
    assert!(!choose(&data, "off", &repositories).unwrap().shown);
    assert_eq!(chosen(&data), Choice::Off);
    assert!(status(&data, &repositories).signs.len() == 1, "what was found is still said");
    assert!(choose(&data, "on", &[]).unwrap().shown);
    assert!(choose(&data, "found", &[]).map(|s| !s.shown).unwrap());
    let kept = fs::read_to_string(data.join(FILE)).unwrap();
    assert!(kept.contains("\"agentFeatures\": \"found\""), "{kept}");
    assert!(kept.contains("\"version\": 1"), "{kept}");
    fs::remove_dir_all(&root).unwrap();
}

#[test]
fn a_word_not_offered_is_refused_and_nothing_written() {
    let root = scratch();
    let data = root.join("data");
    let refused = choose(&data, "sometimes", &[]).unwrap_err();
    assert!(refused.detail.contains("not a choice"));
    assert!(!data.join(FILE).exists());
    fs::remove_dir_all(&root).unwrap();
}

#[test]
fn an_unreadable_file_falls_back_to_the_default() {
    let root = scratch();
    fs::write(root.join(FILE), "{not json").unwrap();
    assert_eq!(chosen(&root), Choice::Found);
    fs::write(root.join(FILE), "{\"agentFeatures\": \"maybe\"}").unwrap();
    assert_eq!(chosen(&root), Choice::Found);
    fs::remove_dir_all(&root).unwrap();
}
