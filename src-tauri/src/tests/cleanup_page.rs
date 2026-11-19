use super::*;
use serde_json::json;
use std::path::Path;

fn answer(items: Value, daemons: u64) -> Value {
    json!({"report": {"sections": [{"heading": "Left alone", "blocks": [{"type": "bullets", "items": ["a save in use"]}]}]},
           "data": {"items": items, "daemons": daemons}})
}

#[test]
fn merges_the_kits_own_leftovers_seen_from_every_repository_once() {
    let shared =
        json!({"group": "Kit build folder", "path": "C:/target/debug", "bytes": 100, "why": "the development build"});
    let first =
        answer(json!([shared, {"group": "Install backups", "path": "D:/b/1", "bytes": 5, "why": "older backups"}]), 2);
    let second =
        answer(json!([shared, {"group": "Install backups", "path": "D:/b/2", "bytes": 7, "why": "older backups"}]), 3);
    let (groups, bytes, daemons, notes) = merge(&[first, second]);
    assert_eq!(bytes, 112);
    assert_eq!(daemons, 3);
    assert_eq!(notes, ["a save in use"]);
    assert_eq!(
        groups[0],
        Group { group: "Kit build folder".to_owned(), items: 1, bytes: 100, why: "the development build".to_owned() }
    );
    assert_eq!((groups[1].group.as_str(), groups[1].items, groups[1].bytes), ("Install backups", 2, 12));
}

#[test]
fn deletes_only_on_apply_and_names_each_group_as_one_argument() {
    let list = arguments(Path::new("/repo"), &[], false);
    assert!(!list.contains(&"--apply".to_owned()));
    let chosen = arguments(Path::new("/repo"), &["Cache: rimworld-saves".to_owned()], true);
    assert!(chosen.contains(&"--group=Cache: rimworld-saves".to_owned()));
    assert!(chosen.contains(&"--apply".to_owned()));
}

#[test]
fn refuses_a_choice_that_is_not_a_list_of_group_names() {
    assert!(checked_groups(&[]).is_err());
    assert!(checked_groups(&["--apply".to_owned()]).is_err());
    assert!(checked_groups(&["two\nlines".to_owned()]).is_err());
    assert!(checked_groups(&["Install backups".to_owned()]).is_ok());
}
