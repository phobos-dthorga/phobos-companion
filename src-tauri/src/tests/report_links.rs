use super::*;
use std::collections::BTreeMap;

#[test]
fn every_mod_is_asked_about_in_one_run_each_as_one_argument() {
    let mut places = BTreeMap::new();
    places.insert("data".to_owned(), PathBuf::from("/games/zed"));
    let game = games::GamePlaces { name: "Zed".to_owned(), steam_app_id: None, places };
    assert_eq!(
        where_arguments(&game, &[PathBuf::from("repo")], &["--sneaky".to_owned(), "D'thorga Framework".to_owned()]),
        [
            "issue-links",
            "where",
            "--name=Zed",
            "--data",
            "/games/zed",
            "--root",
            "repo",
            "--mod=--sneaky",
            "--mod=D'thorga Framework",
            "--json"
        ]
    );
}

#[test]
fn nothing_opens_for_a_repository_no_answer_named() {
    assert!(their_form("nowhere-game", "evil/repo").is_err());
    assert!(open_issue("nowhere-game", "evil/repo", 1).is_err());
    let data = std::env::temp_dir().join(format!("companion-report-links-{}", std::process::id()));
    assert!(report_ours(&data, "nowhere-game", "evil/repo", "A fault", "text").is_err());
    assert!(!data.join(DRAFTS).exists());
}

#[test]
fn a_name_on_several_lines_is_refused() {
    assert!(places("nowhere-game", vec!["two\nlines".to_owned()]).is_err());
}

#[test]
fn their_reports_are_never_asked_for_while_switched_off() {
    let data = std::env::temp_dir().join(format!("companion-their-reports-{}", std::process::id()));
    std::fs::create_dir_all(&data).unwrap();
    online::choose(&data, KIND, false).unwrap();
    let refused = their_reports(&data, "nowhere-game", "a/b", "words").unwrap_err();
    assert!(format!("{refused:?}").contains("switched off"));
    std::fs::remove_dir_all(&data).unwrap();
}
