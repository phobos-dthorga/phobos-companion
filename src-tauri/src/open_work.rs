//! Open items from a repository's work list, where it keeps one: Markdown tables with an Item column and a Status column.

use std::fs;
use std::path::Path;

const FILE: &str = "docs/development/outstanding-work.md";
const OPEN_STATUSES: [&str; 7] = ["open", "in progress", "waits", "waiting", "blocked", "proposed", "done except"];

/// The items still open, in the list's order. A repository with no such list has none.
pub fn read_open(repository_path: &Path) -> Vec<String> {
    fs::read(repository_path.join(FILE)).map(|bytes| parse(&String::from_utf8_lossy(&bytes))).unwrap_or_default()
}

fn parse(text: &str) -> Vec<String> {
    let mut items = Vec::new();
    let mut item_column = None;
    for line in text.lines() {
        if !line.trim_start().starts_with('|') {
            item_column = None;
            continue;
        }
        let cells = cells(line);
        if cells.iter().all(|cell| cell.chars().all(|c| matches!(c, '-' | ':'))) {
            continue;
        }
        let is_header = cells.last().is_some_and(|last| last.eq_ignore_ascii_case("status"));
        if is_header {
            item_column = cells.iter().position(|cell| cell.eq_ignore_ascii_case("item"));
        } else if let (Some(column), Some(status)) = (item_column, cells.last())
            && is_open(status)
            && let Some(item) = cells.get(column)
        {
            items.push(item.clone());
        }
    }
    items
}

fn is_open(status: &str) -> bool {
    let status = status.to_lowercase();
    OPEN_STATUSES.iter().any(|open| status.starts_with(open))
}

fn cells(line: &str) -> Vec<String> {
    line.trim().trim_matches('|').split('|').map(|cell| plain(cell.trim())).collect()
}

/// Markdown marks removed, and a link reduced to its words.
fn plain(cell: &str) -> String {
    let mut text = cell.replace("**", "").replace('`', "");
    while let Some(open) = text.find('[') {
        let Some(middle) = text[open..].find("](").map(|i| i + open) else { break };
        let Some(close) = text[middle..].find(')').map(|i| i + middle) else { break };
        let words = text[open + 1..middle].to_owned();
        text.replace_range(open..=close, &words);
    }
    text
}

#[cfg(test)]
#[path = "tests/open_work.rs"]
mod tests;
