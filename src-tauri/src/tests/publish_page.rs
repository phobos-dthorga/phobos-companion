//! The Publish page's host (0.69.0): names, arguments and refusals only. Nothing here runs the uploader or reaches Steam.
use super::*;
use serde_json::json;

#[test]
fn mods_and_items_have_the_kits_shape() {
    assert!(mod_name("PhobosFramework"));
    assert!(mod_name("my_mod.v2-b"));
    assert!(!mod_name(""));
    assert!(!mod_name("--create"));
    assert!(!mod_name("two words"));
    assert!(!mod_name(&"a".repeat(MAX_MOD_NAME + 1)));
    assert!(item_number("3900000001"));
    assert!(!item_number("0123"));
    assert!(!item_number("12a"));
    assert!(!item_number(""));
}

#[test]
fn readings_and_the_page_are_asked_as_arguments_of_their_own() {
    let root = Path::new("repo");
    assert_eq!(status_arguments(root), ["steam-publish", "status", "--root", "repo", "--no-redact", "--json"]);
    assert_eq!(
        show_arguments(root, "Base"),
        ["steam-publish", "show", "--root", "repo", "Base", "--no-redact", "--json"]
    );
    assert_eq!(page_arguments(root, "Base", None), ["steam-publish", "page", "--root", "repo", "Base", "--json"]);
    assert_eq!(
        page_arguments(root, "Base", Some("--check")),
        ["steam-publish", "page", "--root", "repo", "Base", "--check", "--stdin", "--json"]
    );
    assert_eq!(
        notes_arguments(root, "Base"),
        ["steam-publish", "notes", "--root", "repo", "Base", "--write", "--json"]
    );
    assert_eq!(
        prepare_arguments(root, "Base", true),
        ["steam-publish", "prepare", "--root", "repo", "Base", "--build", "--json"]
    );
    assert_eq!(
        pull_arguments(root),
        ["steam-publish", "pull", "--root", "repo", "--visibility", "--changelog", "--write", "--json"]
    );
}

#[test]
fn an_upload_is_private_unless_the_owner_made_it_public_and_steamcmd_gets_its_own_window() {
    let root = Path::new("repo");
    let create = upload_arguments(root, "Base", "create", "steam").unwrap();
    assert_eq!(
        create,
        ["steam-publish", "upload", "--root", "repo", "Base", "--create", "--via", "steam", "--no-redact", "--json"]
    );
    assert!(!create.iter().any(|a| a.contains("public")));
    let public = upload_arguments(root, "Base", "public", "steamcmd").unwrap();
    assert_eq!(
        public,
        [
            "steam-publish",
            "upload",
            "--root",
            "repo",
            "Base",
            "--update",
            "--visibility",
            "public",
            "--confirm-public",
            "--via",
            "steamcmd",
            "--new-console",
            "--no-redact",
            "--json"
        ]
    );
    assert!(upload_arguments(root, "Base", "delete", "steam").is_err());
    assert!(upload_arguments(root, "Base", "create", "carrier").is_err());
    assert_eq!(
        update_arguments(root, "steam").unwrap(),
        ["steam-publish", "update", "--root", "repo", "--via", "steam", "--no-redact", "--json"]
    );
}

#[test]
fn a_card_names_its_item_and_its_required_items() {
    let show = json!({"itemId": "3900000001", "requiredItems": [
        {"name": "Base", "itemId": "3900000002"}, {"name": "Later", "itemId": null}, {"name": "Odd", "itemId": "-1"}]});
    assert_eq!(items_named(&show), ["3900000001", "3900000002"]);
    assert!(items_named(&json!({})).is_empty());
}

#[test]
fn only_an_item_a_card_named_opens_in_steam() {
    assert!(open_in_steam("3999999999").is_err());
    assert!(open_in_steam("steam://evil").is_err());
}

#[test]
fn the_uploads_setting_starts_on_and_keeps_the_owners_choice() {
    let folder = std::env::temp_dir().join(format!("companion-publishing-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&folder);
    assert!(uploads_on(&folder));
    assert!(!choose_uploads(&folder, false).unwrap());
    assert!(!uploads_on(&folder));
    assert!(choose_uploads(&folder, true).unwrap());
    let _ = std::fs::remove_dir_all(&folder);
}

#[test]
fn an_upload_is_refused_while_the_setting_is_off_before_the_kit_is_asked() {
    let folder = std::env::temp_dir().join(format!("companion-publishing-off-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&folder);
    choose_uploads(&folder, false).unwrap();
    let refused = may_upload(&folder, "upload").unwrap_err();
    assert!(refused.detail.contains("switched off"), "{refused:?}");
    let _ = std::fs::remove_dir_all(&folder);
}

#[test]
fn a_mod_the_last_reading_did_not_name_is_refused() {
    let root = PathBuf::from("somewhere");
    remember_mods(&root, &json!({"mods": [{"mod": "Base"}, {"mod": "--bad"}]}));
    let known = KNOWN_MODS.lock().unwrap().clone();
    assert!(known.contains(&(root.clone(), "Base".to_owned())));
    assert!(!known.iter().any(|(_, m)| m == "--bad"));
}
