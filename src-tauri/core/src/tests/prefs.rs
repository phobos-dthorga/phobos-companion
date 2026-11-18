use super::*;
use serde_json::json;
use std::env;
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT: AtomicUsize = AtomicUsize::new(0);

#[test]
fn a_file_is_written_whole_and_read_back() {
    let folder =
        env::temp_dir().join(format!("companion-prefs-{}-{}", std::process::id(), NEXT.fetch_add(1, Ordering::SeqCst)));
    let path = folder.join("deeper").join("choices.json");
    assert_eq!(read_json(&path).unwrap(), None);
    write_json(&path, &json!({"enabled": true})).unwrap();
    assert_eq!(read_json(&path).unwrap(), Some(json!({"enabled": true})));
    assert!(!path.with_extension("json.tmp").exists());
    fs::write(&path, "{not json").unwrap();
    assert!(read_json(&path).is_err());
    fs::remove_dir_all(&folder).unwrap();
}
