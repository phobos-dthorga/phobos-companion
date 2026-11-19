use super::*;

const PNG: [u8; 12] = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0];

fn data(name: &str) -> PathBuf {
    let path = std::env::temp_dir().join(format!("companion-notes-test-{name}-{}", std::process::id()));
    let _ = fs::remove_dir_all(&path);
    path
}

fn request(stamp: &str, words: &str) -> NoteRequest {
    NoteRequest {
        stamp: stamp.to_owned(),
        game: "First Sample".to_owned(),
        page: "Mods".to_owned(),
        address: "dthorga://mods/first-sample".to_owned(),
        words: words.to_owned(),
        width: 1600,
        height: 900,
    }
}

#[test]
fn a_note_name_is_a_stamp_with_an_optional_count() {
    assert!(is_note_id("20261119-101500"));
    assert!(is_note_id("20261119-101500-2"));
    assert!(is_note_id("20261119-101500-999"));
    assert!(!is_note_id("20261119-101500-1000"));
    assert!(!is_note_id("../20261119-1015"));
    assert!(!is_note_id("20261119_101500"));
    assert!(!is_note_id(""));
}

#[test]
fn a_note_is_written_whole_and_two_in_one_second_both_keep() {
    let data = data("save");
    let first =
        save(&data, &request("20261119-101500", "  The legend hides a bar  "), "0.22.0", &PNG, "2026-11-18T23:15:00Z")
            .unwrap();
    let second = save(&data, &request("20261119-101500", ""), "0.22.0", &PNG, "2026-11-18T23:15:00Z").unwrap();
    assert_eq!(first, "20261119-101500");
    assert_eq!(second, "20261119-101500-2");
    let note: Value =
        serde_json::from_str(&fs::read_to_string(data.join(FOLDER).join(&first).join(NOTE_FILE)).unwrap()).unwrap();
    assert_eq!(note["words"], "The legend hides a bar");
    assert_eq!(note["window"]["width"], 1600);
    assert_eq!(note["format"], 1);
    assert!(data.join(FOLDER).join(&first).join(PICTURE_FILE).is_file());
    let _ = fs::remove_dir_all(&data);
}

#[test]
fn what_is_not_a_png_or_not_a_stamp_is_refused_before_anything_is_written() {
    let data = data("refuse");
    assert!(save(&data, &request("20261119-101500", ""), "0.22.0", b"GIF89a", "t").is_err());
    assert!(save(&data, &request("../../elsewhere", ""), "0.22.0", &PNG, "t").is_err());
    assert!(save(&data, &request("20261119-101500", &"x".repeat(5000)), "0.22.0", &PNG, "t").is_err());
    assert!(!data.join(FOLDER).exists() || fs::read_dir(data.join(FOLDER)).unwrap().next().is_none());
}

#[test]
fn the_list_splits_open_from_dealt_with_newest_first() {
    let data = data("list");
    assert_eq!(list(&data).open.len(), 0);
    save(&data, &request("20261119-090000", "older"), "0.22.0", &PNG, "2026-11-18T22:00:00Z").unwrap();
    save(&data, &request("20261119-100000", "newer"), "0.22.0", &PNG, "2026-11-18T23:00:00Z").unwrap();
    let done = save(&data, &request("20261119-080000", "fixed"), "0.22.0", &PNG, "2026-11-18T21:00:00Z").unwrap();
    fs::write(data.join(FOLDER).join(&done).join(RESOLVED_FILE), r#"{"format":1,"time":"x","how":"Moved it"}"#)
        .unwrap();
    fs::create_dir_all(data.join(FOLDER).join("20261119-110000.partial")).unwrap();
    let notes = list(&data);
    assert_eq!(notes.open.iter().map(|n| n.words.as_str()).collect::<Vec<_>>(), ["newer", "older"]);
    assert_eq!(notes.dealt_count, 1);
    assert_eq!(notes.dealt[0].resolved.as_ref().unwrap().how, "Moved it");
    assert!(notes.open[0].has_picture);
    let _ = fs::remove_dir_all(&data);
}

#[test]
fn only_a_note_name_reaches_the_file_manager() {
    assert!(show(Path::new("."), "../../windows").is_err());
}
