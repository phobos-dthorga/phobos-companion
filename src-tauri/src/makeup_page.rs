//! The Make-up page and the Code map's busiest code: what a repository is made of, how it grew, where the work goes and what each
//! product holds, from the kit's `makeup`, which only reads and names no game.

use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::games;
use companion_core::kit::{self, Outcome};
use serde_json::Value;
use std::path::Path;

const TOOL: &str = "makeup";
/// The longest look back the window may ask for: a year.
const MAX_DAYS: u32 = 366;

/// One question the window may ask, checked.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Question {
    Now,
    Growth,
    Churn(u32),
    Census,
}

pub fn arguments(root: &Path, question: &Question) -> Vec<String> {
    match question {
        Question::Now => Args::new(TOOL, "now").root(root).json(),
        Question::Growth => Args::new(TOOL, "growth").root(root).json(),
        Question::Churn(days) => Args::new(TOOL, "churn").root(root).pair("--days", &days.to_string()).json(),
        Question::Census => Args::new(TOOL, "census").root(root).json(),
    }
}

/// The question the window named; a look back longer than a year is refused.
pub fn question(kind: &str, days: Option<u32>) -> Result<Question, Failure> {
    Ok(match kind {
        "now" => Question::Now,
        "growth" => Question::Growth,
        "churn" => match days.unwrap_or(30) {
            days if days <= MAX_DAYS => Question::Churn(days),
            days => return Err(Failure::refused(format!("{days} days is further back than the tools look"))),
        },
        "census" => Question::Census,
        other => return Err(Failure::refused(format!("{other:?} is not a question the tools answer"))),
    })
}

/// Asks the kit one question about one of the game's repositories; its data, or why it refused.
pub fn ask(
    game: &str,
    repository: &str,
    question: &Question,
    listener: Option<kit::Listener>,
) -> Result<Value, Failure> {
    let found = games::named_repository(game, repository)?;
    let answer = kit::run_hearing(TOOL, &arguments(&found.path, question), listener)?;
    let outcome = Outcome::of(&answer);
    if !outcome.ok {
        return Err(Failure::refused(outcome.refusal.unwrap_or_default()));
    }
    Ok(answer["data"].clone())
}

#[cfg(test)]
#[path = "tests/makeup_page.rs"]
mod tests;
