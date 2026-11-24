//! The setup check (0.87.0; the owner's choices by card, 25 Nov 2026): what the pages use beyond the Companion itself, whether
//! each is on this computer, and how a missing one is fetched. Game-free: the rows are the tool kit's own (`programs status`,
//! kit 1.118.0), and a game's own programs show only for a game on the list.
//!
//! The kit says how a program is fetched and runs nothing. A command is run by the host only on the person's press, after they
//! were shown it whole, and only when it passes `command_of` here: it is the kit's own words for that program, it starts one of
//! `FETCHERS`, the program is still missing, and what it needs first is here.

use serde::Serialize;
use serde_json::Value;

/// The only programs a fetch command may start. The kit holds its commands to the same list (`programs.FETCHERS`).
pub const FETCHERS: [&str; 2] = ["winget", "dotnet"];
const MAX_WORDS: usize = 16;
const MAX_WORD: usize = 120;
const MAX_ADDRESS: usize = 300;
/// The end of a fetch command's output the page is shown.
pub const SHOWN: usize = 6_000;

/// How one row stands. Set aside is the person's own word that they don't need it; it is still missing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum State {
    Here,
    Missing,
    SetAside,
}

/// One program the pages use, as the Setup tab shows it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Row {
    pub key: String,
    pub name: String,
    /// The game whose pages use it; none for what every game's pages use.
    pub game: Option<String>,
    pub needed_by: String,
    /// How it was found, or what happens without it, in the kit's words.
    pub how: String,
    pub state: State,
    /// A page most people open needs it: Home says so while it is missing.
    pub everyday: bool,
    /// Whether it has a page to get it from by hand (the address stays with the host).
    pub page: bool,
    /// The command that fetches it on this system, as it would be typed; none where the kit knows none.
    pub command: Option<String>,
    /// The program that command starts, and whether it is here.
    pub fetcher: Option<String>,
    pub fetcher_here: bool,
    /// The names of the programs that must be here first, and are not.
    pub waits_for: Vec<String>,
}

fn programs(data: &Value) -> &[Value] {
    data["programs"].as_array().map(Vec::as_slice).unwrap_or_default()
}

fn text(value: &Value) -> String {
    value.as_str().unwrap_or_default().to_owned()
}

fn words(program: &Value) -> Option<Vec<String>> {
    let words: Vec<String> = program["fetch"].as_array()?.iter().map(text).collect();
    (!words.is_empty()).then_some(words)
}

fn find<'a>(data: &'a Value, key: &str) -> Option<&'a Value> {
    programs(data).iter().find(|p| p["key"].as_str() == Some(key))
}

fn here(data: &Value, key: &str) -> bool {
    find(data, key).is_some_and(|p| p["here"].as_bool() == Some(true))
}

/// The programs a row waits for: those its `after` names that are not here, by name.
fn waits_for(data: &Value, program: &Value) -> Vec<String> {
    let after = program["after"].as_array().map(Vec::as_slice).unwrap_or_default();
    after
        .iter()
        .filter_map(Value::as_str)
        .filter(|key| !here(data, key))
        .map(|key| find(data, key).map_or_else(|| key.to_owned(), |p| text(&p["name"])))
        .collect()
}

/// The rows to show: every game's programs, and those of the games on the list. `set_aside` holds the keys the person set aside.
pub fn rows(data: &Value, games: &[String], set_aside: &[String]) -> Vec<Row> {
    programs(data)
        .iter()
        .filter(|p| p["game"].as_str().is_none_or(|game| games.iter().any(|g| g == game)))
        .map(|p| {
            let key = text(&p["key"]);
            let fetch = words(p);
            let state = if p["here"].as_bool() == Some(true) {
                State::Here
            } else if set_aside.contains(&key) {
                State::SetAside
            } else {
                State::Missing
            };
            Row {
                name: text(&p["name"]),
                game: p["game"].as_str().map(str::to_owned),
                needed_by: text(&p["neededBy"]),
                how: text(&p["how"]),
                state,
                everyday: p["everyday"].as_bool() == Some(true),
                page: address_of(data, &key).is_ok(),
                command: fetch.as_ref().map(|words| words.join(" ")),
                fetcher: fetch.as_ref().map(|words| words[0].clone()),
                fetcher_here: p["fetchHere"].as_bool() == Some(true),
                waits_for: waits_for(data, p),
                key,
            }
        })
        .collect()
}

/// The command that fetches a program, checked again at the moment of running it: only the kit's own words for that program,
/// only for one still missing, only starting one of `FETCHERS`, and only once what it needs first is here.
pub fn command_of(data: &Value, key: &str) -> Result<Vec<String>, String> {
    let program = find(data, key).ok_or_else(|| format!("the tools name no program {key:?}"))?;
    let name = text(&program["name"]);
    if program["here"].as_bool() == Some(true) {
        return Err(format!("{name} is already on this computer"));
    }
    let words = words(program).ok_or_else(|| format!("no command is known that fetches {name} on this system"))?;
    if !FETCHERS.contains(&words[0].as_str()) {
        return Err(format!("{:?} is not a program a fetch may start", words[0]));
    }
    let sane = |word: &String| !word.is_empty() && word.len() <= MAX_WORD && !word.chars().any(char::is_control);
    if words.len() > MAX_WORDS || !words.iter().all(sane) {
        return Err(format!("the command for {name} is not one line of plain words"));
    }
    let waits = waits_for(data, program);
    if !waits.is_empty() {
        return Err(format!("{name} needs {} first", waits.join(" and ")));
    }
    Ok(words)
}

/// The page a program is got from by hand: only an `https://` address of one line, as the kit names it.
pub fn address_of(data: &Value, key: &str) -> Result<String, String> {
    let program = find(data, key).ok_or_else(|| format!("the tools name no program {key:?}"))?;
    let address = program["url"].as_str().unwrap_or_default();
    let plain = address.len() <= MAX_ADDRESS && !address.chars().any(|c| c.is_control() || c.is_whitespace());
    if address.starts_with("https://") && address.len() > "https://".len() && plain {
        Ok(address.to_owned())
    } else {
        Err(format!("the tools name no page for {key:?}"))
    }
}

/// A fetch command's output made readable: a progress bar redrawn in place (with carriage returns) keeps only its last drawing,
/// colour codes and a spinner's lone strokes are dropped, and only the last `SHOWN` characters are kept.
pub fn tidy(output: &str) -> String {
    let mut lines: Vec<String> = Vec::new();
    for line in output.split('\n') {
        let last = line.split('\r').rev().find(|part| !part.trim().is_empty()).unwrap_or_default();
        let plain = without_codes(last);
        let plain = plain.trim_end();
        if plain.trim().is_empty() || plain.trim().chars().all(|c| "-\\|/".contains(c)) {
            continue;
        }
        if lines.last().map(String::as_str) != Some(plain) {
            lines.push(plain.to_owned());
        }
    }
    let joined = lines.join("\n");
    let skip = joined.chars().count().saturating_sub(SHOWN);
    joined.chars().skip(skip).collect()
}

/// Text without terminal colour and cursor codes (`ESC [ ... letter`).
fn without_codes(text: &str) -> String {
    let mut plain = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\u{1b}' && chars.peek() == Some(&'[') {
            chars.next();
            for code in chars.by_ref() {
                if code.is_ascii_alphabetic() {
                    break;
                }
            }
        } else if c != '\u{1b}' {
            plain.push(c);
        }
    }
    plain
}

/// The value in what Windows' `reg query ... /v Name` prints: the text after its type (`REG_SZ` or `REG_EXPAND_SZ`).
pub fn reg_value(output: &str) -> Option<String> {
    output.lines().find_map(|line| {
        ["REG_EXPAND_SZ", "REG_SZ"].iter().find_map(|kind| {
            let (_, value) = line.split_once(kind)?;
            let value = value.trim();
            (!value.is_empty()).then(|| value.to_owned())
        })
    })
}

/// Text with each `%NAME%` replaced by what `lookup` gives for it; a name it does not know stays as written.
pub fn expand(text: &str, lookup: impl Fn(&str) -> Option<String>) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(start) = rest.find('%') {
        out.push_str(&rest[..start]);
        let after = &rest[start + 1..];
        match after.find('%') {
            Some(end) if end > 0 => match lookup(&after[..end]) {
                Some(value) => {
                    out.push_str(&value);
                    rest = &after[end + 1..];
                }
                None => {
                    out.push('%');
                    rest = after;
                }
            },
            _ => {
                out.push('%');
                rest = after;
            }
        }
    }
    out.push_str(rest);
    out
}

/// The search path a program started now would be given: Windows' own (the computer's, then the person's, as the registry
/// holds them after an installer changed them), then whatever this program's own path has beyond those, in its order. A folder
/// is named once, however it is cased or ends.
pub fn fresh_path(computer: Option<&str>, person: Option<&str>, current: &str) -> String {
    let same = |folder: &str| folder.trim().trim_end_matches(['\\', '/']).to_lowercase();
    let mut seen: Vec<String> = Vec::new();
    let mut folders: Vec<&str> = Vec::new();
    for folder in [computer, person, Some(current)].into_iter().flatten().flat_map(|path| path.split(';')) {
        let key = same(folder);
        if !key.is_empty() && !seen.contains(&key) {
            seen.push(key);
            folders.push(folder.trim());
        }
    }
    folders.join(";")
}

#[cfg(test)]
#[path = "tests/setup.rs"]
mod tests;
