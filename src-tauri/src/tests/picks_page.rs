use super::*;
use serde_json::json;

#[test]
fn picks_and_tries_have_the_kits_shape() {
    assert!(pick_id("billy-kettle"));
    assert!(pick_id("3"));
    assert!(pick_id("tent_heater.v2"));
    assert!(pick_id("none"));
    assert!(!pick_id(""));
    assert!(!pick_id("-rf"));
    assert!(!pick_id("Billy Kettle"));
    assert!(!pick_id(&"a".repeat(MAX_ID + 1)));
}

#[test]
fn a_pick_is_asked_for_as_arguments_of_its_own() {
    let arguments = answer_arguments(Path::new("repo"), "billy-kettle", "3", "  the spout\n shows ").unwrap();
    assert_eq!(
        arguments,
        ["picks", "answer", "--root", "repo", "--id=billy-kettle", "--pick=3", "--words=the spout shows", "--json"]
    );
    assert!(answer_arguments(Path::new("repo"), "billy-kettle", "--apply", "").is_err());
    assert!(answer_arguments(Path::new("repo"), "billy-kettle", "3", &"x".repeat(MAX_WORDS + 1)).is_err());
}

#[test]
fn the_list_is_asked_unredacted_for_the_files_it_names() {
    let arguments = list_arguments(&[PathBuf::from("a"), PathBuf::from("b")]);
    assert_eq!(arguments, ["picks", "list", "--root", "a", "--root", "b", "--no-redact", "--json"]);
}

#[test]
fn every_file_in_use_and_every_try_is_named() {
    let data = json!({"repositories": [{"picks": [
        {"inUse": "C:/repo/Kettle.png", "tries": [{"path": "K:/art/kettle-3.png"}, {"path": "K:/art/kettle-4.png"}]},
        {"inUse": null, "tries": [{"path": "K:/art/heater-11.review.ogg"}]}
    ]}]});
    let found = files_named(&data);
    assert_eq!(found.len(), 4);
    assert!(found.contains(&PathBuf::from("K:/art/heater-11.review.ogg")));
}

#[test]
fn a_repository_with_a_pick_already_in_the_game_is_settled_with_the_kit_s_own_report() {
    let data = json!({"repositories": [
        {"root": "C:/a", "picks": [{"inGame": false}, {"inGame": true}]},
        {"root": "C:/b", "picks": [{"inGame": false}]},
        {"root": "C:/c", "picks": []}
    ]});
    assert_eq!(with_applied(&data), vec![PathBuf::from("C:/a")]);
    assert_eq!(settle_arguments(Path::new("C:/a")), ["picks", "settle", "--root", "C:/a", "--applied", "--json"]);
}
