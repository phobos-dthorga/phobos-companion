use super::*;
use std::collections::BTreeMap;
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
    assert_eq!(ids, ["changelog", "open-work", "decisions", "installs", "test-evidence", "settings"]);
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
    write(&root, &open_work, &open_work.content).unwrap();
    let written = fs::read_to_string(root.join("docs/development/outstanding-work.md")).unwrap();
    assert_eq!(written, open_work.content);
    // Never over a file: the second write is refused and the first stays.
    assert!(write(&root, &open_work, &open_work.content).unwrap_err().contains("already"));
    fs::write(root.join("config.txt"), "mine").unwrap();
    // A changelog anywhere the kit looks counts as having one.
    fs::create_dir_all(root.join("mods/one")).unwrap();
    fs::write(root.join("mods/one/CHANGELOG.md"), "mine").unwrap();
    assert!(write(&root, &starter("changelog"), "x").unwrap_err().contains("already"));
    assert!(!root.join("CHANGELOG.md").exists());
    // Not a folder, nothing written.
    assert!(write(&root.join("nothing-here"), &starter("decisions"), "x").is_err());
    let _ = fs::remove_dir_all(&root);
}

fn values(pairs: &[(&str, &str)]) -> BTreeMap<String, String> {
    pairs.iter().map(|(k, v)| ((*k).to_owned(), (*v).to_owned())).collect()
}

#[test]
fn a_form_fills_its_template_with_checked_values() {
    let root = folder("form");
    let installs = starter("installs");
    assert_eq!(installs.needs, Some(Needs::InstallAdapter));
    let text =
        content_of(&installs, &values(&[("install", "{python} scripts/deploy.py --apply {mod}")]), &root, "rimworld")
            .unwrap();
    let written: serde_json::Value = serde_json::from_str(&text).unwrap();
    assert_eq!(written["game"], "rimworld");
    assert_eq!(written["mods"], "mods", "the default when left empty");
    assert_eq!(written["backups"], ".local/deploy-backups");
    assert_eq!(written["install"], serde_json::json!(["{python}", "scripts/deploy.py", "--apply", "{mod}"]));
    assert!(text.ends_with("}\n"));
    // An install command without {mod} can't name the mod it installs.
    let without = content_of(&installs, &values(&[("install", "make install")]), &root, "rimworld");
    assert!(without.unwrap_err().contains("{mod}"));
    // A folder outside the repository, by .. or a full path elsewhere, is refused.
    for outside in ["../elsewhere", "/tmp/x", "C:/Windows"] {
        let refused = content_of(&installs, &values(&[("install", "x {mod}"), ("mods", outside)]), &root, "rimworld");
        assert!(refused.is_err(), "{outside}");
    }
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn a_full_path_from_the_picker_inside_the_repository_is_written_relative() {
    let root = folder("picker");
    fs::create_dir_all(root.join("docs/testing")).unwrap();
    let full = root.join("docs").join("testing");
    assert_eq!(inside(&root, &full.to_string_lossy()).unwrap(), "docs/testing");
    assert_eq!(inside(&root, "./mods").unwrap(), "mods");
    assert_eq!(inside(&root, ".local/backups").unwrap(), ".local/backups");
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn the_test_list_must_be_a_markdown_file_already_in_the_repository() {
    let root = folder("evidence");
    let evidence = starter("test-evidence");
    assert!(
        content_of(&evidence, &values(&[("doc", "docs/tests.md")]), &root, "g")
            .unwrap_err()
            .contains("not in the repository")
    );
    fs::create_dir_all(root.join("docs")).unwrap();
    fs::write(root.join("docs/tests.md"), "| # | What | Passes |\n").unwrap();
    fs::write(root.join("docs/tests.txt"), "x").unwrap();
    assert!(content_of(&evidence, &values(&[("doc", "docs/tests.txt")]), &root, "g").unwrap_err().contains(".md"));
    let text = content_of(&evidence, &values(&[("doc", "docs/tests.md")]), &root, "g").unwrap();
    let written: serde_json::Value = serde_json::from_str(&text).unwrap();
    assert_eq!(written["doc"], "docs/tests.md");
    assert_eq!(written["rows"], serde_json::json!({}));
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn a_setting_s_key_and_variable_are_checked_and_an_empty_optional_name_leaves() {
    let root = folder("settings");
    let settings = starter("settings");
    let filled =
        values(&[("key", "artWorkPath"), ("env", "PHOBOS_ART_WORK"), ("description", "Where the art tools work")]);
    let text = content_of(&settings, &filled, &root, "g").unwrap();
    let written: serde_json::Value = serde_json::from_str(&text).unwrap();
    let setting = &written["settings"][0];
    assert_eq!(setting["kind"], "folder", "the default choice");
    assert!(setting.get("name").is_none(), "left empty, so left out");
    assert_eq!(written["schemaVersion"], 1);
    let bad_key = values(&[("key", "Art Work"), ("env", "X"), ("description", "d")]);
    assert!(content_of(&settings, &bad_key, &root, "g").is_err());
    let bad_env = values(&[("key", "art"), ("env", "lower"), ("description", "d")]);
    assert!(content_of(&settings, &bad_env, &root, "g").is_err());
    let bad_kind = values(&[("key", "art"), ("env", "ART"), ("kind", "both"), ("description", "d")]);
    assert!(content_of(&settings, &bad_kind, &root, "g").is_err());
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn words_keep_a_quoted_path_whole() {
    assert_eq!(words(r#"{python} "my scripts/deploy.py"  {mod}"#), ["{python}", "my scripts/deploy.py", "{mod}"]);
    assert!(words("   ").is_empty());
}

#[test]
fn a_form_s_template_and_fields_must_agree() {
    let form = |fields: &str, template: &str| {
        format!(
            r#"{{"about": "", "starters": [{{"id": "x", "path": "x.json", "present": "file", "chosen": false, "forAgents": false,
                 "fields": {fields}, "template": {template}}}]}}"#
        )
    };
    assert!(checked(&form(r#"[{"id": "a", "kind": "text", "label": "A"}]"#, r#"{"a": "{{a}}"}"#)).is_ok());
    assert!(checked(&form(r#"[{"id": "a", "kind": "text", "label": "A"}]"#, r#"{"a": "{{b}}"}"#)).is_err());
    assert!(checked(&form(r#"[{"id": "a", "kind": "text", "label": "A"}]"#, r#"{"a": 1}"#)).is_err());
    assert!(checked(&form(r#"[{"id": "a", "kind": "choice", "label": "A"}]"#, r#"{"a": "{{a}}"}"#)).is_err());
    assert!(checked(&form(r#"[{"id": "a", "kind": "text"}]"#, r#"{"a": "{{a}}"}"#)).is_err());
}
