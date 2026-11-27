use super::*;
use std::env;

fn folder(name: &str) -> PathBuf {
    let folder = env::temp_dir().join(format!(
        "companion-kept-{name}-{}-{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::SeqCst)
    ));
    fs::create_dir_all(&folder).unwrap();
    folder
}

fn key(parts: &[&str]) -> Vec<String> {
    parts.iter().map(|part| (*part).to_owned()).collect()
}

#[test]
fn an_answer_is_kept_and_read_back_with_when() {
    let data = folder("round");
    assert_eq!(read(&data, "test_lists", &key(&["rimworld"])).unwrap(), None);
    keep(&data, "test_lists", &key(&["rimworld"]), &json!([{"repository": "one"}])).unwrap();
    let kept = read(&data, "test_lists", &key(&["rimworld"])).unwrap().unwrap();
    assert_eq!(kept.answer, json!([{"repository": "one"}]));
    assert!(kept.at.ends_with('Z'));
    keep(&data, "test_lists", &key(&["rimworld"]), &json!([])).unwrap();
    assert_eq!(read(&data, "test_lists", &key(&["rimworld"])).unwrap().unwrap().answer, json!([]));
    let left: Vec<_> = fs::read_dir(data.join(FOLDER).join("test_lists")).unwrap().collect();
    assert_eq!(left.len(), 1, "no half-written file is left beside it");
    fs::remove_dir_all(&data).unwrap();
}

#[test]
fn only_the_slow_readings_by_plain_names() {
    let data = folder("names");
    assert!(file(&data, "move_install", &key(&["rimworld"])).is_err(), "a press is never kept");
    assert!(file(&data, "test_code", &key(&["rimworld", "../x"])).is_err());
    assert!(file(&data, "test_code", &key(&[])).is_err());
    assert_eq!(
        file(&data, "test_code", &key(&["rimworld", "phobos-rimworld"])).unwrap(),
        data.join("answers").join("test_code").join("rimworld--phobos-rimworld.json")
    );
    fs::remove_dir_all(&data).unwrap();
}

#[test]
fn an_unreadable_or_older_kept_answer_is_none() {
    let data = folder("bad");
    let path = file(&data, "mod_installs", &key(&["rimworld"])).unwrap();
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, "{not json").unwrap();
    assert_eq!(read(&data, "mod_installs", &key(&["rimworld"])).unwrap(), None);
    fs::write(&path, r#"{"format": 99, "at": "t", "answer": 1}"#).unwrap();
    assert_eq!(read(&data, "mod_installs", &key(&["rimworld"])).unwrap(), None);
    fs::remove_dir_all(&data).unwrap();
}

#[test]
fn reading_ahead_starts_on_and_off_refuses_it() {
    let data = folder("ahead");
    assert!(reading_ahead_on(&data));
    assert!(allowed_ahead(&data, true).is_ok());
    assert!(!choose_reading_ahead(&data, false).unwrap());
    assert!(allowed_ahead(&data, true).is_err());
    assert!(allowed_ahead(&data, false).is_ok(), "a page's own reading is never refused");
    fs::remove_dir_all(&data).unwrap();
}
