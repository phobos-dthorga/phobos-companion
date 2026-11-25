//! Starter files for a repository (0.89.0; the owner's choice by card, 25 Nov 2026: "Starter files for a repository"): the
//! few files the Companion's pages read from a repository, offered where one is missing. Game-free: the starters are data,
//! `config/repository-starters.json`.
//!
//! **A starter is written only where its path is free**, opened as a new file so nothing already there is ever replaced, inside
//! the repository's own folder, and only for an id the file names. What a repository has is read, never changed otherwise.
//!
//! **Forms** (0.93.0; the owner's choice by card, 25 Nov 2026: "Yes, build forms"): a starter may have `fields` and a JSON
//! `template` instead of fixed `content`. Each field the person fills is checked by its kind here, then put where the template says
//! `"{{id}}"`; the file is the template filled, shown whole before it is written.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::{Component, Path, PathBuf};
use std::sync::OnceLock;

const STARTERS: &str = include_str!("../../../config/repository-starters.json");
/// Where a changelog may sit below the repository's root, and the folders never looked in: as the tool kit's `changes` finds them.
pub const CHANGELOG: &str = "CHANGELOG.md";
pub const SEARCH_DEPTH: usize = 3;
const SKIP_FOLDERS: [&str; 8] =
    ["node_modules", "external", "obj", "bin", "target", "dist", "artifacts", "__pycache__"];
const MAX_CONTENT: usize = 4_000;
const MAX_VALUE: usize = 200;
const MAX_WORDS: usize = 24;

/// How the Companion knows a repository already has a starter's kind of file.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Present {
    /// Any changelog up to `SEARCH_DEPTH` folders down.
    Changelog,
    /// The starter's own path.
    File,
}

/// What a form's field holds, and how it is checked (0.93.0).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FieldKind {
    /// A folder inside the repository, written relative to it with `/`.
    Folder,
    /// A file inside the repository, likewise.
    File,
    /// A command, as words: the template gets a list.
    Command,
    /// One line of words.
    Text,
    /// A setting's key: a lower-case letter, then letters and digits.
    Key,
    /// An environment variable's name: upper-case letters, digits and `_`.
    Env,
    /// One of `options`.
    Choice,
    /// The repository's game, as the games list names it: never shown, never typed.
    Game,
}

/// One field of a starter's form (0.93.0). Its words are English in the data, as the agents' are.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Field {
    pub id: String,
    pub kind: FieldKind,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub hint: String,
    #[serde(default)]
    pub default: Option<String>,
    /// It may be left empty: then its key leaves the file.
    #[serde(default)]
    pub optional: bool,
    /// A file must end so (`.md`).
    #[serde(default)]
    pub ends: Option<String>,
    /// A file must be there already.
    #[serde(default)]
    pub exists: bool,
    /// A command must have this word (`{mod}`).
    #[serde(default)]
    pub must_have: Option<String>,
    #[serde(default)]
    pub options: Vec<String>,
}

/// What a starter needs before it is offered (0.93.0).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Needs {
    /// The tool kit can install mods for the repository's game (`games/<game>/installs.py`).
    InstallAdapter,
}

/// One starter file, as `config/repository-starters.json` gives it.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Starter {
    pub id: String,
    pub path: String,
    pub present: Present,
    /// Ticked when offered.
    pub chosen: bool,
    /// Offered only while the features for AI agent sessions are shown.
    pub for_agents: bool,
    /// The file as written, for a starter with no form.
    #[serde(default)]
    pub content: String,
    /// A form's fields, and the JSON they fill (0.93.0).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub fields: Vec<Field>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub template: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub needs: Option<Needs>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct File {
    #[allow(dead_code)]
    about: String,
    starters: Vec<Starter>,
}

/// A path inside a repository, written with `/`: relative, no `..`, no drive, nothing hidden but what git itself keeps.
pub fn plain_path(path: &str) -> bool {
    !path.is_empty()
        && !path.starts_with('/')
        && !path.contains('\\')
        && !path.contains(':')
        && path.split('/').all(|part| !part.is_empty() && part != "." && part != ".." && !part.starts_with('.'))
}

/// The starters, checked: ids unique and plain, paths inside the repository, content of a sane size.
pub fn checked(text: &str) -> Result<Vec<Starter>, String> {
    let file: File = serde_json::from_str(text).map_err(|e| e.to_string())?;
    let mut seen: Vec<&str> = Vec::new();
    for starter in &file.starters {
        let id_ok = !starter.id.is_empty() && starter.id.bytes().all(|b| b.is_ascii_lowercase() || b == b'-');
        if !id_ok || seen.contains(&starter.id.as_str()) {
            return Err(format!("{:?} is not a plain id, or is named twice", starter.id));
        }
        seen.push(&starter.id);
        if !plain_path(&starter.path) {
            return Err(format!("{}: {:?} is not a plain path inside a repository", starter.id, starter.path));
        }
        match &starter.template {
            None if starter.content.is_empty() || starter.content.len() > MAX_CONTENT || !starter.fields.is_empty() => {
                return Err(format!(
                    "{}: its content is empty or too long, or it has fields and no template",
                    starter.id
                ));
            }
            Some(template) => checked_form(starter, template)?,
            None => {}
        }
    }
    Ok(file.starters)
}

/// A form's fields and template agree: ids plain and unique, every placeholder a field, every field used, a choice with options.
fn checked_form(starter: &Starter, template: &Value) -> Result<(), String> {
    if !starter.content.is_empty() {
        return Err(format!("{}: a form has a template, not content", starter.id));
    }
    let mut ids: Vec<&str> = Vec::new();
    for field in &starter.fields {
        let plain = !field.id.is_empty() && field.id.bytes().all(|b| b.is_ascii_alphanumeric());
        if !plain || ids.contains(&field.id.as_str()) {
            return Err(format!("{}: field {:?} is not a plain id, or is named twice", starter.id, field.id));
        }
        if field.kind == FieldKind::Choice && field.options.is_empty() {
            return Err(format!("{}: choice {:?} has no options", starter.id, field.id));
        }
        if field.kind != FieldKind::Game && field.label.is_empty() {
            return Err(format!("{}: field {:?} has no label", starter.id, field.id));
        }
        ids.push(&field.id);
    }
    let mut used = Vec::new();
    placeholders(template, &mut used);
    if let Some(unknown) = used.iter().find(|id| !ids.contains(&id.as_str())) {
        return Err(format!("{}: the template names {unknown:?}, which is no field", starter.id));
    }
    if let Some(unused) = ids.iter().find(|id| !used.iter().any(|u| u == *id)) {
        return Err(format!("{}: field {unused:?} is not in the template", starter.id));
    }
    Ok(())
}

/// The field a string stands for, when it is exactly `{{id}}`.
fn placeholder(text: &str) -> Option<&str> {
    text.strip_prefix("{{")?.strip_suffix("}}").filter(|id| !id.is_empty())
}

fn placeholders(value: &Value, found: &mut Vec<String>) {
    match value {
        Value::String(text) => found.extend(placeholder(text).map(str::to_owned)),
        Value::Array(items) => items.iter().for_each(|item| placeholders(item, found)),
        Value::Object(map) => map.values().for_each(|item| placeholders(item, found)),
        _ => {}
    }
}

/// A path the person gave, as a path inside the repository written with `/`: relative as typed, or from the folder picker's full
/// path inside the repository. Folders git keeps hidden (`.local`) are allowed here; `..`, drives and anything outside are not.
pub fn inside(root: &Path, given: &str) -> Result<String, String> {
    let given = given.trim();
    let path = Path::new(given);
    let relative: PathBuf = if path.is_absolute() {
        let root = root.canonicalize().map_err(|e| format!("{}: {e}", root.display()))?;
        let full = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
        full.strip_prefix(&root).map(Path::to_path_buf).map_err(|_| format!("{given} is not inside the repository"))?
    } else {
        path.to_path_buf()
    };
    let mut parts = Vec::new();
    for part in relative.components() {
        match part {
            Component::Normal(name) => parts.push(name.to_string_lossy().into_owned()),
            Component::CurDir => {}
            _ => return Err(format!("{given} is not a plain path inside the repository")),
        }
    }
    let written = parts.join("/");
    if written.is_empty() || written.contains(':') || written.len() > MAX_VALUE {
        return Err(format!("{given:?} is not a path inside the repository"));
    }
    Ok(written)
}

/// A command's words: split at spaces, with "double quotes" keeping a word whole.
pub fn words(text: &str) -> Vec<String> {
    let mut words = Vec::new();
    let mut word = String::new();
    let (mut quoted, mut started) = (false, false);
    for c in text.chars() {
        match c {
            '"' => {
                quoted = !quoted;
                started = true;
            }
            c if c.is_whitespace() && !quoted => {
                if started {
                    words.push(std::mem::take(&mut word));
                    started = false;
                }
            }
            c => {
                word.push(c);
                started = true;
            }
        }
    }
    if started {
        words.push(word);
    }
    words
}

fn one_line(text: &str) -> bool {
    text.len() <= MAX_VALUE && !text.chars().any(char::is_control)
}

/// One field's value, checked by its kind; None for an optional field left empty.
fn value_of(field: &Field, given: &str, root: &Path, game: &str) -> Result<Option<Value>, String> {
    let label = if field.label.is_empty() { &field.id } else { &field.label };
    let given = given.trim();
    if field.kind == FieldKind::Game {
        return Ok(Some(Value::from(game)));
    }
    if given.is_empty() {
        return if field.optional { Ok(None) } else { Err(format!("{label}: fill it in")) };
    }
    let value = match field.kind {
        FieldKind::Folder | FieldKind::File => {
            let path = inside(root, given).map_err(|e| format!("{label}: {e}"))?;
            if let Some(ends) = &field.ends
                && !path.to_lowercase().ends_with(&ends.to_lowercase())
            {
                return Err(format!("{label}: a file ending {ends}"));
            }
            if field.exists && !root.join(&path).is_file() {
                return Err(format!("{label}: {path} is not in the repository"));
            }
            Value::from(path)
        }
        FieldKind::Command => {
            let words = words(given);
            if words.is_empty() || words.len() > MAX_WORDS || !words.iter().all(|w| !w.is_empty() && one_line(w)) {
                return Err(format!("{label}: one line of up to {MAX_WORDS} words"));
            }
            if let Some(word) = &field.must_have
                && !words.iter().any(|w| w == word)
            {
                return Err(format!("{label}: it needs {word} as one of its words, where the mod's name goes"));
            }
            Value::from(words)
        }
        FieldKind::Text => {
            if !one_line(given) {
                return Err(format!("{label}: one line, at most {MAX_VALUE} letters"));
            }
            Value::from(given)
        }
        FieldKind::Key => {
            let ok = given.len() <= 40
                && given.chars().next().is_some_and(|c| c.is_ascii_lowercase())
                && given.chars().all(|c| c.is_ascii_alphanumeric());
            if !ok {
                return Err(format!("{label}: a lower-case letter, then letters and digits (artWorkPath)"));
            }
            Value::from(given)
        }
        FieldKind::Env => {
            let ok = given.len() <= 60
                && given.chars().next().is_some_and(|c| c.is_ascii_uppercase())
                && given.chars().all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == '_');
            if !ok {
                return Err(format!("{label}: upper-case letters, digits and _ (PHOBOS_ART_WORK)"));
            }
            Value::from(given)
        }
        FieldKind::Choice => {
            if !field.options.iter().any(|o| o == given) {
                return Err(format!("{label}: one of {}", field.options.join(", ")));
            }
            Value::from(given)
        }
        FieldKind::Game => unreachable!("answered above"),
    };
    Ok(Some(value))
}

/// The template with each `{{id}}` replaced; a key whose field was left empty leaves its object.
fn filled(template: &Value, values: &BTreeMap<String, Option<Value>>) -> Value {
    match template {
        Value::String(text) => match placeholder(text).and_then(|id| values.get(id)) {
            Some(Some(value)) => value.clone(),
            _ => template.clone(),
        },
        Value::Array(items) => Value::Array(items.iter().map(|item| filled(item, values)).collect()),
        Value::Object(map) => {
            let mut out = Map::new();
            for (key, item) in map {
                let empty = item.as_str().and_then(placeholder).is_some_and(|id| matches!(values.get(id), Some(None)));
                if !empty {
                    out.insert(key.clone(), filled(item, values));
                }
            }
            Value::Object(out)
        }
        _ => template.clone(),
    }
}

/// A starter's file as it would be written: its content, or its form's template filled with the person's values, each checked.
pub fn content_of(
    starter: &Starter,
    given: &BTreeMap<String, String>,
    root: &Path,
    game: &str,
) -> Result<String, String> {
    let Some(template) = &starter.template else { return Ok(starter.content.clone()) };
    let mut values = BTreeMap::new();
    for field in &starter.fields {
        let typed = given.get(&field.id).map(String::as_str).filter(|v| !v.trim().is_empty());
        let raw = typed.or(field.default.as_deref()).unwrap_or_default();
        values.insert(field.id.clone(), value_of(field, raw, root, game)?);
    }
    let text = serde_json::to_string_pretty(&filled(template, &values)).map_err(|e| e.to_string())?;
    Ok(text + "\n")
}

/// The starters the Companion carries.
pub fn starters() -> &'static [Starter] {
    static READ: OnceLock<Vec<Starter>> = OnceLock::new();
    READ.get_or_init(|| checked(STARTERS).unwrap_or_default())
}

/// Whether a repository has a changelog where the tool kit looks for them.
pub fn has_changelog(root: &Path) -> bool {
    let mut stack = vec![(root.to_path_buf(), 0)];
    while let Some((folder, depth)) = stack.pop() {
        let Ok(entries) = fs::read_dir(&folder) else { continue };
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().into_owned();
            let Ok(kind) = entry.file_type() else { continue };
            if kind.is_file() && name == CHANGELOG {
                return true;
            }
            if kind.is_dir() && depth < SEARCH_DEPTH && !name.starts_with('.') && !SKIP_FOLDERS.contains(&name.as_str())
            {
                stack.push((entry.path(), depth + 1));
            }
        }
    }
    false
}

/// Whether a repository already has a starter's kind of file.
pub fn present(root: &Path, starter: &Starter) -> bool {
    match starter.present {
        Present::Changelog => has_changelog(root),
        Present::File => root.join(&starter.path).exists(),
    }
}

/// Writes one starter into a repository, only where its path is free: opened as a new file, so an existing one is never
/// replaced, its folders made as needed. The repository must be a folder already. `content` is `content_of`'s.
pub fn write(root: &Path, starter: &Starter, content: &str) -> Result<(), String> {
    if content.is_empty() || content.len() > MAX_CONTENT {
        return Err(format!("{}: nothing to write, or too much", starter.path));
    }
    if !plain_path(&starter.path) {
        return Err(format!("{:?} is not a plain path inside a repository", starter.path));
    }
    if !root.is_dir() {
        return Err(format!("{} is not a folder", root.display()));
    }
    let path = root.join(&starter.path);
    if present(root, starter) {
        return Err(format!("{} already has one", root.display()));
    }
    if let Some(folder) = path.parent() {
        fs::create_dir_all(folder).map_err(|e| format!("{}: {e}", folder.display()))?;
    }
    // The folder made must still be the repository's own: no link out of it on the way.
    let inside = path
        .parent()
        .and_then(|folder| folder.canonicalize().ok())
        .zip(root.canonicalize().ok())
        .is_some_and(|(folder, root)| folder.starts_with(root));
    if !inside {
        return Err(format!("{} would be outside the repository", starter.path));
    }
    let mut file = OpenOptions::new().write(true).create_new(true).open(&path).map_err(|e| match e.kind() {
        ErrorKind::AlreadyExists => format!("{} is already there", starter.path),
        _ => format!("{}: {e}", path.display()),
    })?;
    file.write_all(content.as_bytes()).map_err(|e| format!("{}: {e}", path.display()))
}

#[cfg(test)]
#[path = "tests/starters.rs"]
mod tests;
