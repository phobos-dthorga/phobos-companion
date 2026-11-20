//! Themes (0.33.0; the owner, 20 Nov 2026: themes "as OnAir has them", after onair-wyrmgrid's ADR-0009 "Data-only community
//! themes"). A theme is data, never CSS: a version, an id, a name, an optional author, and exactly the window's colour roles as
//! `#RRGGBB`. The window turns each role into a CSS variable it already uses, so a theme cannot hide a refusal, fake a control,
//! load anything or reach any data. This module is the authority: it checks a theme's shape and that every role it names can be
//! read where the window puts it, keeps the owner's themes and choice in the program's own folder, and falls back to House
//! D'thorga whenever the chosen theme is missing or no longer passes.

use crate::failure::{Failure, FailureCode};
use serde::Serialize;
use serde_json::{Map, Value};
use std::collections::BTreeMap;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

pub const SCHEMA_VERSION: u64 = 1;
/// Built-in themes' ids start with this; a theme of the owner's may not.
pub const BUILT_IN_PREFIX: &str = "org.phobosdthorga.companion.";
pub const DEFAULT_ID: &str = "org.phobosdthorga.companion.house-dthorga";
/// The largest theme file read, as OnAir's: a theme is twenty colours, so anything larger is not one.
pub const MAX_BYTES: usize = 32 * 1024;
pub const MAX_NAME: usize = 64;
pub const MAX_AUTHOR: usize = 80;
pub const MAX_ID: usize = 96;
/// Where the choice is kept, beside the owner's themes.
const CHOICE: &str = "chosen.json";

/// Every role a theme gives, in the order a theme file lists them. The window's CSS names each as `--colour-<role>`.
pub const ROLES: [&str; 20] = [
    "canvas",
    "surface",
    "surface_raised",
    "surface_soft",
    "text",
    "text_muted",
    "line",
    "accent",
    "observed",
    "risk",
    "success",
    "comparison",
    "series_1",
    "series_2",
    "series_3",
    "series_4",
    "series_5",
    "series_6",
    "series_7",
    "series_8",
];
/// What everything else is drawn on.
pub const SURFACES: [&str; 4] = ["canvas", "surface", "surface_raised", "surface_soft"];
/// What is read as words on those surfaces: WCAG 2.2's 4.5:1 for text.
pub const READABLE: [&str; 7] = ["text", "text_muted", "accent", "observed", "risk", "success", "comparison"];
/// Charts' colours: 3:1 against every surface, WCAG's figure for graphics.
pub const SERIES: [&str; 8] =
    ["series_1", "series_2", "series_3", "series_4", "series_5", "series_6", "series_7", "series_8"];
pub const TEXT_MIN: f64 = 4.5;
pub const GRAPHIC_MIN: f64 = 3.0;
/// Dividers need only show (Observatory's figure, which the House D'thorga theme was first held to).
pub const LINE_MIN: f64 = 1.5;

const BUILT_INS: [&str; 3] = [
    include_str!("../../../themes/house-dthorga.json"),
    include_str!("../../../themes/phobos-dthorga.json"),
    include_str!("../../../themes/high-contrast.json"),
];

/// A theme that passed every check of its shape. Its colours may still fail `contrast_problems`.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Theme {
    pub schema_version: u64,
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    pub colours: BTreeMap<String, String>,
}

impl Theme {
    pub fn colour(&self, role: &str) -> &str {
        self.colours.get(role).map_or("#000000", String::as_str)
    }

    /// The theme as a file: the roles in their order, two-space indents, a last newline.
    pub fn to_file(&self) -> String {
        let mut colours = Map::new();
        for role in ROLES {
            colours.insert(role.to_owned(), Value::String(self.colour(role).to_owned()));
        }
        let mut document = Map::new();
        document.insert("schema_version".into(), self.schema_version.into());
        document.insert("id".into(), self.id.clone().into());
        document.insert("name".into(), self.name.clone().into());
        if let Some(author) = &self.author {
            document.insert("author".into(), author.clone().into());
        }
        document.insert("colours".into(), Value::Object(colours));
        serde_json::to_string_pretty(&Value::Object(document)).unwrap_or_default() + "\n"
    }

    pub fn built_in(&self) -> bool {
        self.id.starts_with(BUILT_IN_PREFIX)
    }
}

fn valid_colour(value: &str) -> bool {
    value.len() == 7 && value.starts_with('#') && value[1..].bytes().all(|b| b.is_ascii_hexdigit())
}

fn valid_label(value: &str, longest: usize) -> bool {
    !value.trim().is_empty() && value.chars().count() <= longest && !value.chars().any(char::is_control)
}

/// An id a theme may have: lower-case letters, digits, dots and dashes, starting and ending with a letter or digit.
pub fn valid_id(id: &str) -> bool {
    (3..=MAX_ID).contains(&id.len())
        && id.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-' || b == b'.')
        && id.bytes().next().is_some_and(|b| b.is_ascii_alphanumeric())
        && id.bytes().last().is_some_and(|b| b.is_ascii_alphanumeric())
}

/// A theme file read and its shape checked, in words when it fails. `built_in` allows the reserved id prefix.
pub fn parse(text: &str, built_in: bool) -> Result<Theme, String> {
    if text.len() > MAX_BYTES {
        return Err(format!(
            "a theme file is at most {} KB; this one is larger, so it is not a theme",
            MAX_BYTES / 1024
        ));
    }
    let value: Value = serde_json::from_str(text.trim_start_matches('\u{feff}'))
        .map_err(|problem| format!("it is not a theme file ({problem})"))?;
    let document = value.as_object().ok_or("it is not a theme file")?;
    for key in document.keys() {
        if !["schema_version", "id", "name", "author", "colours"].contains(&key.as_str()) {
            return Err(format!("it holds {key:?}, which a theme cannot: only an id, a name, an author and colours"));
        }
    }
    let version = document.get("schema_version").and_then(Value::as_u64);
    if version != Some(SCHEMA_VERSION) {
        return Err(format!(
            "it is written for theme format {}, and this program reads format {SCHEMA_VERSION}",
            version.map_or("unknown".to_owned(), |v| v.to_string())
        ));
    }
    let id = document.get("id").and_then(Value::as_str).unwrap_or_default();
    if !valid_id(id) {
        return Err(format!(
            "its id {id:?} is not one a theme may have: lower-case letters, digits, dots and dashes, 3 to {MAX_ID}"
        ));
    }
    if !built_in && id.starts_with(BUILT_IN_PREFIX) {
        return Err(format!("its id starts with {BUILT_IN_PREFIX}, which only the program's own themes may use"));
    }
    let name = document.get("name").and_then(Value::as_str).unwrap_or_default();
    if !valid_label(name, MAX_NAME) {
        return Err(format!("its name must be one line of up to {MAX_NAME} characters"));
    }
    let author = match document.get("author") {
        None => None,
        Some(value) => match value.as_str() {
            Some(author) if valid_label(author, MAX_AUTHOR) => Some(author.to_owned()),
            _ => return Err(format!("its author must be one line of up to {MAX_AUTHOR} characters")),
        },
    };
    let given = document.get("colours").and_then(Value::as_object).ok_or("it has no colours")?;
    let mut colours = BTreeMap::new();
    for (role, value) in given {
        if !ROLES.contains(&role.as_str()) {
            return Err(format!("it names a colour {role:?}, which the window has no place for"));
        }
        let colour = value.as_str().unwrap_or_default();
        if !valid_colour(colour) {
            return Err(format!("its {role} is {colour:?}; a colour is written #RRGGBB"));
        }
        colours.insert(role.clone(), colour.to_uppercase());
    }
    if let Some(missing) = ROLES.iter().find(|role| !colours.contains_key(**role)) {
        return Err(format!("it has no {missing} colour; a theme gives every one"));
    }
    Ok(Theme { schema_version: SCHEMA_VERSION, id: id.to_owned(), name: name.trim().to_owned(), author, colours })
}

/// WCAG 2.2's contrast between two `#RRGGBB` colours.
pub fn contrast(first: &str, second: &str) -> f64 {
    let luminance = |hex: &str| {
        let channel = |at: usize| {
            let value = f64::from(u8::from_str_radix(hex.get(at..at + 2).unwrap_or("00"), 16).unwrap_or(0)) / 255.0;
            if value <= 0.04045 { value / 12.92 } else { ((value + 0.055) / 1.055).powf(2.4) }
        };
        0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
    };
    let (a, b) = (luminance(first), luminance(second));
    (a.max(b) + 0.05) / (a.min(b) + 0.05)
}

/// One pair a theme draws together that cannot be told apart well enough.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Problem {
    pub role: String,
    pub on: String,
    pub ratio: f64,
    pub needs: f64,
}

/// Every pair that fails: words on surfaces at 4.5:1, chart colours at 3:1, lines at 1.5:1. Empty for a theme that can be read.
pub fn contrast_problems(theme: &Theme) -> Vec<Problem> {
    let mut found = Vec::new();
    for on in SURFACES {
        let checks = READABLE
            .iter()
            .map(|role| (*role, TEXT_MIN))
            .chain(SERIES.iter().map(|role| (*role, GRAPHIC_MIN)))
            .chain(std::iter::once(("line", LINE_MIN)));
        for (role, needs) in checks {
            let ratio = contrast(theme.colour(role), theme.colour(on));
            if ratio < needs {
                found.push(Problem {
                    role: role.to_owned(),
                    on: on.to_owned(),
                    ratio: (ratio * 100.0).round() / 100.0,
                    needs,
                });
            }
        }
    }
    found
}

fn problems_in_words(problems: &[Problem]) -> String {
    let shown: Vec<String> = problems
        .iter()
        .take(4)
        .map(|p| format!("{} on {} is {:.2}:1, needs {}:1", p.role, p.on, p.ratio, p.needs))
        .collect();
    let more = problems.len().saturating_sub(shown.len());
    format!(
        "some of its colours cannot be read well enough: {}{}",
        shown.join("; "),
        if more > 0 { format!(", and {more} more") } else { String::new() }
    )
}

/// A theme ready to use: its shape and its contrast both pass.
pub fn usable(text: &str, built_in: bool) -> Result<Theme, String> {
    let theme = parse(text, built_in)?;
    let problems = contrast_problems(&theme);
    if !problems.is_empty() {
        return Err(problems_in_words(&problems));
    }
    Ok(theme)
}

/// The program's own themes, each checked as any other.
pub fn built_ins() -> Vec<Theme> {
    BUILT_INS.iter().filter_map(|text| usable(text, true).ok()).collect()
}

// ---------------------------------------------------------------- the owner's themes and choice

/// A theme on offer, and whether it is the program's own or one the owner imported or made.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Offered {
    pub theme: Theme,
    pub built_in: bool,
}

/// Every theme on offer, the one in use, and why the choice was set aside when it was.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Status {
    pub chosen: String,
    pub active: Theme,
    pub themes: Vec<Offered>,
    /// The owner's themes that could not be read, by file, with why: shown, never used.
    pub unreadable: Vec<(String, String)>,
    /// Why the chosen theme is not the one in use, when it is not.
    pub fell_back: Option<String>,
}

fn failed(path: &Path, problem: &std::io::Error) -> Failure {
    Failure::new(FailureCode::WriteFailed, format!("{}: {problem}", path.display()))
}

/// Where a theme of the owner's is kept.
pub fn file_of(folder: &Path, id: &str) -> PathBuf {
    folder.join(format!("{id}.json"))
}

fn owners(folder: &Path) -> (Vec<Theme>, Vec<(String, String)>) {
    let (mut found, mut unreadable) = (Vec::new(), Vec::new());
    let Ok(entries) = fs::read_dir(folder) else { return (found, unreadable) };
    let mut paths: Vec<PathBuf> = entries.filter_map(Result::ok).map(|e| e.path()).collect();
    paths.sort();
    for path in paths {
        let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
        if !name.ends_with(".json") || name == CHOICE {
            continue;
        }
        match fs::read_to_string(&path).map_err(|problem| problem.to_string()).and_then(|text| usable(&text, false)) {
            Ok(theme) if file_of(folder, &theme.id) == path => found.push(theme),
            Ok(theme) => unreadable
                .push((name, format!("it holds the theme {}, so its file should be {}.json", theme.id, theme.id))),
            Err(why) => unreadable.push((name, why)),
        }
    }
    (found, unreadable)
}

fn chosen_id(folder: &Path) -> String {
    let read = fs::read_to_string(folder.join(CHOICE)).ok();
    read.and_then(|text| serde_json::from_str::<Value>(&text).ok())
        .and_then(|value| value["chosen"].as_str().map(str::to_owned))
        .unwrap_or_else(|| DEFAULT_ID.to_owned())
}

/// Every theme on offer and the one in use. `folder` is the program's own themes folder; it need not exist yet.
pub fn status(folder: &Path) -> Status {
    let (mine, unreadable) = owners(folder);
    let mut themes: Vec<Offered> = built_ins().into_iter().map(|theme| Offered { theme, built_in: true }).collect();
    themes.extend(mine.into_iter().map(|theme| Offered { theme, built_in: false }));
    let chosen = chosen_id(folder);
    let found = themes.iter().find(|offered| offered.theme.id == chosen).map(|offered| offered.theme.clone());
    let fallback = || {
        themes
            .iter()
            .find(|o| o.theme.id == DEFAULT_ID)
            .or(themes.first())
            .map(|o| o.theme.clone())
            .expect("a built-in theme")
    };
    let (active, fell_back) = match found {
        Some(theme) => (theme, None),
        None => (
            fallback(),
            Some(match unreadable.iter().find(|(file, _)| *file == format!("{chosen}.json")) {
                Some((_, why)) => format!("the theme {chosen} could not be used: {why}"),
                None => format!("the theme {chosen} is no longer here"),
            }),
        ),
    };
    Status { chosen, active, themes, unreadable, fell_back }
}

fn write_choice(folder: &Path, id: &str) -> Result<(), Failure> {
    crate::prefs::write_json(&folder.join(CHOICE), &serde_json::json!({ "chosen": id }))
}

/// Uses a theme on offer, from now on.
pub fn choose(folder: &Path, id: &str) -> Result<Status, Failure> {
    if !status(folder).themes.iter().any(|offered| offered.theme.id == id) {
        return Err(Failure::refused(format!("there is no theme {id} to use")));
    }
    write_choice(folder, id)?;
    Ok(status(folder))
}

/// Keeps a theme of the owner's (imported or made), and uses it. A theme with the same id is replaced: an intended revision.
/// Refused in words when it fails a check, or repeats another theme's colours under another id.
pub fn keep(folder: &Path, text: &str) -> Result<Status, Failure> {
    let theme = usable(text, false).map_err(Failure::refused)?;
    if let Some(twin) = status(folder)
        .themes
        .into_iter()
        .find(|offered| offered.theme.id != theme.id && offered.theme.colours == theme.colours)
    {
        return Err(Failure::refused(format!("it has exactly the colours of {}, already on offer", twin.theme.name)));
    }
    fs::create_dir_all(folder).map_err(|problem| failed(folder, &problem))?;
    let path = file_of(folder, &theme.id);
    let fresh = path.with_extension("json.new");
    fs::write(&fresh, theme.to_file()).map_err(|problem| failed(&fresh, &problem))?;
    fs::rename(&fresh, &path).map_err(|problem| failed(&path, &problem))?;
    write_choice(folder, &theme.id)?;
    Ok(status(folder))
}

/// Takes a theme of the owner's away. The program's own cannot be; the one in use falls back to House D'thorga.
pub fn remove(folder: &Path, id: &str) -> Result<Status, Failure> {
    if id.starts_with(BUILT_IN_PREFIX) {
        return Err(Failure::refused("the program's own themes cannot be removed"));
    }
    if !valid_id(id) {
        return Err(Failure::refused(format!("{id:?} is not a theme's id")));
    }
    let path = file_of(folder, id);
    match fs::remove_file(&path) {
        Ok(()) => {}
        Err(problem) if problem.kind() == ErrorKind::NotFound => {
            return Err(Failure::refused(format!("there is no theme {id} of yours to remove")));
        }
        Err(problem) => return Err(failed(&path, &problem)),
    }
    if chosen_id(folder) == id {
        write_choice(folder, DEFAULT_ID)?;
    }
    Ok(status(folder))
}

/// A theme on offer, as a file to save elsewhere.
pub fn export(folder: &Path, id: &str) -> Result<Theme, Failure> {
    status(folder)
        .themes
        .into_iter()
        .find(|offered| offered.theme.id == id)
        .map(|offered| offered.theme)
        .ok_or_else(|| Failure::refused(format!("there is no theme {id} to save")))
}

/// Writes a theme file where the owner chose, whole: through a file beside it and a rename.
pub fn write_file(destination: &Path, text: &str) -> Result<(), Failure> {
    if !destination.is_absolute() || destination.file_name().is_none() {
        return Err(Failure::refused("a theme is saved to a full path, chosen in the save dialog"));
    }
    let fresh = destination.with_extension("json.new");
    fs::write(&fresh, text).map_err(|problem| failed(&fresh, &problem))?;
    fs::rename(&fresh, destination).map_err(|problem| failed(destination, &problem))
}

#[cfg(test)]
#[path = "tests/themes.rs"]
mod tests;
