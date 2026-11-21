use super::*;
use serde_json::json;

fn named(change: &str, old_path: Option<&str>) -> Named {
    Named { old_path: old_path.map(str::to_owned), change: change.to_owned(), media: "picture".to_owned() }
}

#[test]
fn each_side_of_a_committed_change_is_read_from_the_commit_or_its_parent() {
    let root = Path::new("repo");
    let changed = named("changed", None);
    assert_eq!(
        source(root, Some("abc1234"), "a/boat.png", &changed, Side::Before),
        Source::Revision("abc1234^".into(), "a/boat.png".into())
    );
    assert_eq!(
        source(root, Some("abc1234"), "a/boat.png", &changed, Side::After),
        Source::Revision("abc1234".into(), "a/boat.png".into())
    );
    let renamed = named("renamed", Some("a/old.png"));
    assert_eq!(
        source(root, Some("abc1234"), "a/boat.png", &renamed, Side::Before),
        Source::Revision("abc1234^".into(), "a/old.png".into())
    );
    assert_eq!(source(root, Some("abc1234"), "a/boat.png", &named("added", None), Side::Before), Source::Missing);
    assert_eq!(source(root, Some("abc1234"), "a/boat.png", &named("removed", None), Side::After), Source::Missing);
}

#[test]
fn changes_in_no_commit_yet_read_the_last_commit_and_the_file_on_disk() {
    let root = Path::new("repo");
    let changed = named("changed", None);
    assert_eq!(
        source(root, None, "a/boat.png", &changed, Side::Before),
        Source::Revision("HEAD".into(), "a/boat.png".into())
    );
    assert_eq!(source(root, None, "a/boat.png", &changed, Side::After), Source::Disk(root.join("a/boat.png")));
}

#[test]
fn a_side_is_before_or_after_and_nothing_else() {
    assert_eq!(Side::named("before").unwrap(), Side::Before);
    assert_eq!(Side::named("after").unwrap(), Side::After);
    assert!(Side::named("HEAD").is_err());
}

#[test]
fn a_copy_is_named_for_its_side_and_commit() {
    assert_eq!(copy_name("mods/x/Tipper_north.png", Side::Before, None), "Tipper_north (before).png");
    assert_eq!(
        copy_name("mods/x/Tipper_north.png", Side::After, Some("da02525a1234")),
        "Tipper_north (after da02525a).png"
    );
    assert_eq!(copy_name("LICENSE", Side::After, None), "LICENSE (after)");
    assert_eq!(copy_name("x/.hidden", Side::After, None), ".hidden (after)");
}

#[test]
fn only_binary_files_an_answer_named_are_remembered() {
    remember(
        Path::new("remember-test-root"),
        &json!({
            "commit": {"hash": "abcdef1234567"},
            "files": [
                {"path": "a.png", "binary": true, "change": "changed", "media": "picture"},
                {"path": "b.cs", "binary": false, "change": "changed", "media": null},
                {"path": "c.dll", "binary": true, "change": "added", "media": "program"}
            ]
        }),
    );
    let known = NAMED.lock().unwrap();
    let files = &known[&(PathBuf::from("remember-test-root"), Some("abcdef1234567".to_owned()))];
    assert_eq!(files.keys().collect::<Vec<_>>(), ["a.png", "c.dll"]);
    assert_eq!(files["c.dll"].media, "program");
}

#[test]
fn a_program_is_never_among_the_kinds_opened() {
    assert!(!OPENABLE.contains(&"program"));
    assert!(!OPENABLE.contains(&"other"));
}

#[test]
fn only_copies_more_than_a_day_old_are_let_go() {
    let folder = std::env::temp_dir().join(format!("phobos-companion-opened-{}", std::process::id()));
    fs::create_dir_all(&folder).unwrap();
    fs::write(folder.join("fresh.png"), b"x").unwrap();
    let_go_of_old(&folder, SystemTime::now());
    assert!(folder.join("fresh.png").exists());
    let_go_of_old(&folder, SystemTime::now() + KEEP_OPENED + Duration::from_secs(60));
    assert!(!folder.join("fresh.png").exists());
    let _ = fs::remove_dir_all(&folder);
}
