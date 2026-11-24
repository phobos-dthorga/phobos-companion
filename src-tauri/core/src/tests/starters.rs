use super::*;
use std::path::PathBuf;

fn folder(name: &str) -> PathBuf {
    let folder = std::env::temp_dir().join(format!("companion-starters-{name}-{}", std::process::id()));
    let _ = fs::remove_dir_all(&folder);
    fs::create_dir_all(&folder).expect("a folder");
    folder
}

fn starter(id: &str) -> Starter {
    starters().iter().find(|s| s.id == id).expect("the starter").clone()
}

#[test]
fn the_companion_s_starters_are_read_and_checked() {
    let ids: Vec<&str> = starters().iter().map(|s| s.id.as_str()).collect();
    assert_eq!(ids, ["changelog", "open-work", "decisions"]);
    assert!(starter("changelog").chosen && !starter("decisions").chosen && starter("decisions").for_agents);
    assert!(starter("changelog").content.contains("## [Unreleased]"));
    // The decisions starter is the tool kit's empty file, as JSON.
    let decisions: serde_json::Value = serde_json::from_str(&starter("decisions").content).unwrap();
    assert_eq!(decisions["schemaVersion"], 1);
}

#[test]
fn a_starter_s_path_stays_inside_the_repository() {
    for good in ["CHANGELOG.md", "docs/development/outstanding-work.md", "config/decisions.json"] {
        assert!(plain_path(good), "{good}");
    }
    for bad in ["", "/etc/x", "../x", "a/../b", "a//b", "C:/x", "a\\b", ".git/config", "docs/.hidden", "./x"] {
        assert!(!plain_path(bad), "{bad}");
    }
    let bad = r#"{"about": "", "starters": [{"id": "x", "path": "../x", "present": "file", "chosen": true, "forAgents": false, "content": "x"}]}"#;
    assert!(checked(bad).is_err());
    let twice = r#"{"about": "", "starters": [
        {"id": "x", "path": "a", "present": "file", "chosen": true, "forAgents": false, "content": "x"},
        {"id": "x", "path": "b", "present": "file", "chosen": true, "forAgents": false, "content": "x"}]}"#;
    assert!(checked(twice).is_err());
}

#[test]
fn a_changelog_is_found_where_the_tool_kit_looks_and_nowhere_else() {
    let root = folder("changelog");
    assert!(!has_changelog(&root));
    fs::create_dir_all(root.join("node_modules/x")).unwrap();
    fs::write(root.join("node_modules/x/CHANGELOG.md"), "x").unwrap();
    fs::create_dir_all(root.join("a/b/c/d")).unwrap();
    fs::write(root.join("a/b/c/d/CHANGELOG.md"), "x").unwrap();
    assert!(!has_changelog(&root), "skipped folders and four deep are not looked in");
    fs::write(root.join("a/b/c/CHANGELOG.md"), "x").unwrap();
    assert!(has_changelog(&root));
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn a_starter_is_written_only_where_its_path_is_free() {
    let root = folder("write");
    let open_work = starter("open-work");
    write(&root, &open_work).unwrap();
    let written = fs::read_to_string(root.join("docs/development/outstanding-work.md")).unwrap();
    assert_eq!(written, open_work.content);
    // Never over a file: the second write is refused and the first stays.
    assert!(write(&root, &open_work).unwrap_err().contains("already"));
    fs::write(root.join("config.txt"), "mine").unwrap();
    // A changelog anywhere the kit looks counts as having one.
    fs::create_dir_all(root.join("mods/one")).unwrap();
    fs::write(root.join("mods/one/CHANGELOG.md"), "mine").unwrap();
    assert!(write(&root, &starter("changelog")).unwrap_err().contains("already"));
    assert!(!root.join("CHANGELOG.md").exists());
    // Not a folder, nothing written.
    assert!(write(&root.join("nothing-here"), &starter("decisions")).is_err());
    let _ = fs::remove_dir_all(&root);
}
