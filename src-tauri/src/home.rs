//! The home page's answer to "where was I?", game by game. It only reads.

use crate::changelog::{self, PendingRelease};
use crate::failure::Failure;
use crate::games::{self, Game, Repository};
use crate::git::{self, ReadFailure, Reading, RepositoryProblem};
use crate::open_work;
use serde::Serialize;
use std::cmp::Reverse;
use std::thread;

const COMMITS_PER_REPOSITORY: usize = 5;
const LATEST_SHOWN: usize = 8;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct WorkItem {
    pub repository: String,
    pub unix: i64,
    pub subject: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Unfinished {
    pub repository: String,
    pub files: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Problem {
    pub repository: String,
    pub problem: RepositoryProblem,
    pub detail: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct GameHome {
    pub id: String,
    pub name: String,
    pub last_worked: Option<i64>,
    pub latest: Vec<WorkItem>,
    pub unfinished: Vec<Unfinished>,
    pub pending: Vec<PendingRelease>,
    pub open_work: Vec<String>,
    pub problems: Vec<Problem>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Home {
    pub list_found: bool,
    pub games: Vec<GameHome>,
}

struct RepositoryReading {
    name: String,
    git: Result<Reading, ReadFailure>,
    pending: Vec<PendingRelease>,
    open_work: Vec<String>,
}

/// Reads every game on the owner's list, each repository on its own thread.
pub fn read_home() -> Result<Home, Failure> {
    let Some(listed) = games::load()? else {
        return Ok(Home { list_found: false, games: Vec::new() });
    };
    let mut games: Vec<GameHome> = listed.iter().map(read_game).collect();
    sort_games(&mut games);
    Ok(Home { list_found: true, games })
}

fn read_game(game: &Game) -> GameHome {
    let readings = thread::scope(|scope| {
        let workers: Vec<_> = game.repositories.iter().map(|r| scope.spawn(move || read_repository(r))).collect();
        workers
            .into_iter()
            .zip(&game.repositories)
            .map(|(worker, r)| worker.join().unwrap_or_else(|_| panicked(r)))
            .collect()
    });
    assemble(game, readings)
}

fn read_repository(repository: &Repository) -> RepositoryReading {
    RepositoryReading {
        name: repository.name.clone(),
        git: git::read(&repository.path, COMMITS_PER_REPOSITORY),
        pending: changelog::read_pending(&repository.path, &repository.name),
        open_work: open_work::read_open(&repository.path),
    }
}

fn panicked(repository: &Repository) -> RepositoryReading {
    RepositoryReading {
        name: repository.name.clone(),
        git: Err(ReadFailure {
            problem: RepositoryProblem::GitFailed,
            detail: "the reader stopped unexpectedly".to_owned(),
        }),
        pending: Vec::new(),
        open_work: Vec::new(),
    }
}

fn assemble(game: &Game, readings: Vec<RepositoryReading>) -> GameHome {
    let mut home = GameHome {
        id: game.id.clone(),
        name: game.name.clone(),
        last_worked: None,
        latest: Vec::new(),
        unfinished: Vec::new(),
        pending: Vec::new(),
        open_work: Vec::new(),
        problems: Vec::new(),
    };
    for reading in readings {
        match reading.git {
            Ok(git) => {
                if git.uncommitted > 0 {
                    home.unfinished.push(Unfinished { repository: reading.name.clone(), files: git.uncommitted });
                }
                home.latest.extend(git.commits.into_iter().map(|commit| WorkItem {
                    repository: reading.name.clone(),
                    unix: commit.unix,
                    subject: commit.subject,
                }));
            }
            Err(failure) => {
                home.problems.push(Problem {
                    repository: reading.name,
                    problem: failure.problem,
                    detail: failure.detail,
                });
            }
        }
        home.pending.extend(reading.pending);
        home.open_work.extend(reading.open_work);
    }
    home.latest.sort_by(|a, b| {
        (Reverse(a.unix), &a.repository, &a.subject).cmp(&(Reverse(b.unix), &b.repository, &b.subject))
    });
    home.last_worked = home.latest.first().map(|item| item.unix);
    home.latest.truncate(LATEST_SHOWN);
    home.unfinished.sort_by(|a, b| (Reverse(a.files), &a.repository).cmp(&(Reverse(b.files), &b.repository)));
    home.pending.sort_by(|a, b| (Reverse(&a.draft_date), &a.product).cmp(&(Reverse(&b.draft_date), &b.product)));
    home
}

/// Most recently worked on first; games with no history last, by name.
fn sort_games(games: &mut [GameHome]) {
    games.sort_by(|a, b| (Reverse(a.last_worked), &a.name).cmp(&(Reverse(b.last_worked), &b.name)));
}

#[cfg(test)]
#[path = "tests/home.rs"]
mod tests;
