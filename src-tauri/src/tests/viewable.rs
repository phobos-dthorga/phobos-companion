use super::*;
use serde_json::json;

#[test]
fn only_pictures_and_sounds_are_viewable() {
    assert!(is_viewable(Path::new("a/Boat.PNG")));
    assert!(is_viewable(Path::new("a/Boat.dds")));
    assert!(is_viewable(Path::new("a/horn.ogg")));
    assert!(!is_viewable(Path::new("a/Boat.dll")));
    assert!(!is_viewable(Path::new("a/About.xml")));
    assert!(!is_viewable(Path::new("a/noextension")));
}

#[test]
fn a_changed_file_is_named_in_every_copy_of_its_mod() {
    let status = json!({"mods": [{
        "installed": {"folder": "C:/Game/Mods/Boats"},
        "repository": {"folder": "D:/repo/mods/Boats"},
        "backups": [{"folder": "K:/backups/Boats 2026-11-20"}],
        "files": {"paths": [{"path": "Textures/Boat.png"}, {"path": "../outside.png"}, {"path": "Defs/Boats.xml"}]}
    }]});
    let found = in_installs(&status);
    assert_eq!(found.len(), 6);
    assert!(found.contains(&PathBuf::from("C:/Game/Mods/Boats").join("Textures/Boat.png")));
    assert!(found.contains(&PathBuf::from("K:/backups/Boats 2026-11-20").join("Textures/Boat.png")));
    assert!(!found.iter().any(|p| p.to_string_lossy().contains("outside")));
}

#[test]
fn previews_and_texture_pairs_are_named_from_their_answers() {
    let listing = json!({"mods": [{"preview": "C:/Mods/A/About/Preview.png"}, {"preview": null}]});
    assert_eq!(in_mod_list(&listing), [PathBuf::from("C:/Mods/A/About/Preview.png")]);
    let pairs = json!({"folder": "C:/Mods/A", "pairs": [{"picture": "Textures/A.png", "encoded": "Textures/A.dds"},
        {"picture": null, "encoded": "Textures/Gone.dds"}]});
    assert_eq!(in_pairs(&pairs).len(), 3);
}

#[test]
fn a_file_no_answer_named_is_refused() {
    let named = std::env::temp_dir().join(format!("phobos-companion-viewable-{}.png", std::process::id()));
    fs::write(&named, b"png").unwrap();
    assert!(bytes(&named.to_string_lossy()).is_err());
    remember([named.clone()]);
    assert_eq!(bytes(&named.to_string_lossy()).unwrap(), b"png");
    let _ = fs::remove_file(&named);
}
