use super::*;
use crate::git::Commit;
use std::path::PathBuf;

fn game() -> Game {
    Game { id: "g".to_owned(), name: "Game".to_owned(), repositories: Vec::<Repository>::new() }
}

fn repository(name: &str, commits: &[(i64, &str)], uncommitted: usize) -> RepositoryReading {
    RepositoryReading {
        name: name.to_owned(),
        git: Ok(Reading {
            commits: commits
                .iter()
                .map(|(unix, subject)| Commit { hash: "h".to_owned(), unix: *unix, subject: (*subject).to_owned() })
                .collect(),
            uncommitted,
        }),
        pending: Vec::new(),
        open_work: Vec::new(),
    }
}

#[test]
fn merges_repositories_newest_first() {
    let home =
        assemble(&game(), vec![repository("a", &[(10, "old")], 0), repository("b", &[(30, "new"), (5, "older")], 0)]);
    assert_eq!(home.latest.iter().map(|w| w.subject.as_str()).collect::<Vec<_>>(), ["new", "old", "older"]);
    assert_eq!(home.last_worked, Some(30));
    assert_eq!(home.latest[0].repository, "b");
}

#[test]
fn shows_only_the_latest_few() {
    let commits: Vec<(i64, &str)> = (0..20).map(|n| (n, "x")).collect();
    let home = assemble(&game(), vec![repository("a", &commits, 0)]);
    assert_eq!(home.latest.len(), LATEST_SHOWN);
    assert_eq!(home.last_worked, Some(19));
}

#[test]
fn lists_unfinished_repositories_biggest_first() {
    let home = assemble(&game(), vec![repository("a", &[], 2), repository("b", &[], 0), repository("c", &[], 9)]);
    assert_eq!(home.unfinished.iter().map(|u| u.repository.as_str()).collect::<Vec<_>>(), ["c", "a"]);
}

#[test]
fn a_game_with_no_history_has_no_date() {
    assert_eq!(assemble(&game(), vec![repository("a", &[], 0)]).last_worked, None);
}

#[test]
fn a_repository_that_cannot_be_read_is_reported_and_the_rest_still_show() {
    let failed = RepositoryReading {
        name: "broken".to_owned(),
        git: Err(ReadFailure { problem: RepositoryProblem::Missing, detail: "gone".to_owned() }),
        pending: Vec::new(),
        open_work: Vec::new(),
    };
    let home = assemble(&game(), vec![failed, repository("fine", &[(5, "ok")], 0)]);
    assert_eq!(home.problems.len(), 1);
    assert_eq!(home.problems[0].problem, RepositoryProblem::Missing);
    assert_eq!(home.latest.len(), 1);
}

#[test]
fn games_sort_by_most_recent_and_undated_last() {
    let entry = |name: &str, last_worked| GameHome {
        id: name.to_owned(),
        name: name.to_owned(),
        last_worked,
        latest: Vec::new(),
        unfinished: Vec::new(),
        pending: Vec::new(),
        open_work: Vec::new(),
        problems: Vec::new(),
    };
    let mut games = vec![entry("Never", None), entry("Old", Some(1)), entry("New", Some(9))];
    sort_games(&mut games);
    assert_eq!(games.iter().map(|g| g.name.as_str()).collect::<Vec<_>>(), ["New", "Old", "Never"]);
}

#[test]
fn a_real_game_reads_end_to_end() {
    let repositories = vec![Repository {
        name: "phobos-companion".to_owned(),
        path: PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".."),
    }];
    let home = read_game(&Game { id: "self".to_owned(), name: "Self".to_owned(), repositories });
    assert!(home.problems.is_empty(), "{:?}", home.problems);
}
