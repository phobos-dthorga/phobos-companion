//! Code colours brought in from a VS Code theme (0.77.0; the owner, 24 Nov 2026, chose "bring in a theme" by card;
//! docs/code-reading.md, step 2). A VS Code theme's token colours (a scope, a colour, a style) are read from its file, and from the
//! files it builds on (`include`), kept in the program's own folder, and used for code in place of the theme's own twelve code
//! colours when the person chooses. Data only: a selector, a `#RRGGBB` colour and the words italic, bold, underline and
//! strikethrough reach the window, nothing else from the file.
//!
//! **What a file may name.** A theme may build on another file only in its own folder, at most `MAX_FILES` deep, as VS Code's own
//! Dark Modern builds on Dark+, which builds on Visual Studio Dark: no other folder, no path, and no loop.
//!
//! **A colour that cannot be read** on the Companion theme in use (4.5:1 on the background and on removed and added lines) takes
//! that theme's own colour for the same kind of code, found through the window's scope table, and the status says how many did
//! (agent's default, the lean of the owner's open decision `code-colours-contrast`).

use crate::failure::{Failure, FailureCode};
use crate::themes::{self, Theme};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeSet;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

pub const SCHEMA_VERSION: u64 = 1;
/// The largest theme file read. VS Code's own are 4 to 17 KB and an extension's rarely more than 100 KB.
pub const MAX_BYTES: usize = 512 * 1024;
/// The file chosen and the files it builds on, at most.
pub const MAX_FILES: usize = 4;
pub const MAX_RULES: usize = 5000;
pub const MAX_SELECTOR: usize = 400;
pub const MAX_NAME: usize = 64;
/// The choice meaning "the theme's own code colours".
pub const THEME_OWN: &str = "theme";
const CHOICE: &str = "chosen.json";
const FONT_STYLES: [&str; 4] = ["italic", "bold", "underline", "strikethrough"];
/// The largest extension manifest read when looking for installed themes.
const MAX_MANIFEST: u64 = 512 * 1024;
const MAX_INSTALLED: usize = 500;

/// One of a theme's token colour rules: the selectors it applies to, and its colour or style or both.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Rule {
    pub scope: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub foreground: Option<String>,
    #[serde(default, rename = "fontStyle", skip_serializing_if = "Option::is_none")]
    pub font_style: Option<String>,
}

/// A set of code colours as kept: from one VS Code theme and the files it builds on.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CodeColours {
    pub schema_version: u64,
    pub id: String,
    pub name: String,
    /// The file it was brought in from, by name only.
    pub from: String,
    /// What the theme says it is: dark, light, or high contrast (VS Code's `type`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    /// The colour of code no rule names (VS Code's `editor.foreground`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub plain: Option<String>,
    pub rules: Vec<Rule>,
    /// What was left out or changed while reading it, in words.
    #[serde(default)]
    pub notes: Vec<String>,
}

// ---------------------------------------------------------------- reading a VS Code theme

/// Comments and trailing commas taken out, as VS Code allows them in its JSON, so the text can be read as JSON: the comments
/// first, so a comma followed only by a comment is seen as the trailing comma it is.
pub fn strip_jsonc(text: &str) -> String {
    strip_trailing_commas(&strip_comments(text.trim_start_matches('\u{feff}')))
}

/// Calls `outside` with each character outside a string and its place, and copies string characters as they are.
fn walk(text: &str, mut outside: impl FnMut(&[char], usize, &mut String) -> usize) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(chars.len());
    let mut at = 0;
    let mut in_string = false;
    while at < chars.len() {
        let c = chars[at];
        if in_string {
            out.push(c);
            if c == '\\' {
                if let Some(escaped) = chars.get(at + 1) {
                    out.push(*escaped);
                    at += 1;
                }
            } else if c == '"' {
                in_string = false;
            }
            at += 1;
        } else if c == '"' {
            in_string = true;
            out.push(c);
            at += 1;
        } else {
            at = outside(&chars, at, &mut out);
        }
    }
    out
}

fn strip_comments(text: &str) -> String {
    walk(text, |chars, mut at, out| {
        match (chars[at], chars.get(at + 1)) {
            ('/', Some('/')) => {
                while at < chars.len() && chars[at] != '\n' {
                    at += 1;
                }
            }
            ('/', Some('*')) => {
                at += 2;
                while at < chars.len() && !(chars[at] == '*' && chars.get(at + 1) == Some(&'/')) {
                    at += 1;
                }
                at += 2;
            }
            (c, _) => {
                out.push(c);
                at += 1;
            }
        }
        at
    })
}

fn strip_trailing_commas(text: &str) -> String {
    walk(text, |chars, at, out| {
        let c = chars[at];
        let trailing = c == ',' && matches!(chars[at + 1..].iter().find(|ch| !ch.is_whitespace()), Some('}' | ']'));
        if !trailing {
            out.push(c);
        }
        at + 1
    })
}

/// A colour as `#RRGGBB`, and whether the file gave it a see-through part (drawn solid here). `#RGB`, `#RGBA` and `#RRGGBBAA` are
/// read as VS Code reads them.
pub fn colour(value: &str) -> Option<(String, bool)> {
    let hex = value.trim().strip_prefix('#')?;
    if !hex.bytes().all(|b| b.is_ascii_hexdigit()) {
        return None;
    }
    let (rgb, alpha) = match hex.len() {
        3 | 4 => (hex[..3].chars().flat_map(|c| [c, c]).collect::<String>(), hex.len() == 4),
        6 | 8 => (hex[..6].to_owned(), hex.len() == 8),
        _ => return None,
    };
    Some((format!("#{}", rgb.to_uppercase()), alpha))
}

fn selector_ok(selector: &str) -> bool {
    !selector.is_empty()
        && selector.len() <= MAX_SELECTOR
        && !selector.chars().any(|c| c.is_control() || matches!(c, '<' | '"' | '\\' | '`' | '{' | '}'))
}

/// The file an `include` names, when it is one this module may read: a JSON file in the same folder, by name only.
pub fn include_name(value: &str) -> Option<String> {
    let name = value.trim().trim_start_matches("./");
    let ok = !name.is_empty()
        && name.len() <= 120
        && name.to_ascii_lowercase().ends_with(".json")
        && !name.contains(['/', '\\', ':'])
        && !name.starts_with('.')
        && !name.chars().any(char::is_control);
    ok.then(|| name.to_owned())
}

/// What one file gave, before the files it builds on are added beneath it.
struct OneFile {
    name: Option<String>,
    kind: Option<String>,
    plain: Option<String>,
    rules: Vec<Rule>,
    include: Option<String>,
    see_through: usize,
    skipped: usize,
    semantic: bool,
    elsewhere: Option<String>,
}

fn read_one(text: &str, file: &str) -> Result<OneFile, String> {
    if text.len() > MAX_BYTES {
        return Err(format!("{file} is larger than {} KB, so it is not read as a theme", MAX_BYTES / 1024));
    }
    let value: Value = serde_json::from_str(&strip_jsonc(text))
        .map_err(|problem| format!("{file} is not a VS Code theme ({problem})"))?;
    let document = value.as_object().ok_or_else(|| format!("{file} is not a VS Code theme"))?;
    let label = |key: &str| {
        document
            .get(key)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|s| !s.is_empty() && !s.chars().any(char::is_control))
    };
    let mut found = OneFile {
        name: label("name").map(|s| s.chars().take(MAX_NAME).collect()),
        kind: label("type").map(|s| s.chars().take(16).collect()),
        plain: None,
        rules: Vec::new(),
        include: None,
        see_through: 0,
        skipped: 0,
        semantic: document.contains_key("semanticTokenColors"),
        elsewhere: None,
    };
    if let Some(include) = document.get("include") {
        let written = include.as_str().unwrap_or_default();
        found.include = Some(include_name(written).ok_or_else(|| {
            format!(
                "{file} builds on {written:?}, which is not a theme file in its own folder, so it was not brought in"
            )
        })?);
    }
    if let Some(foreground) = document.get("colors").and_then(|c| c.get("editor.foreground")).and_then(Value::as_str)
        && let Some((plain, alpha)) = colour(foreground)
    {
        found.plain = Some(plain);
        found.see_through += usize::from(alpha);
    }
    match document.get("tokenColors") {
        Some(Value::Array(entries)) => {
            for entry in entries {
                read_rule(entry, &mut found);
            }
        }
        Some(Value::String(other)) => found.elsewhere = Some(other.clone()),
        _ => {}
    }
    Ok(found)
}

fn read_rule(entry: &Value, found: &mut OneFile) {
    let Some(settings) = entry.get("settings").and_then(Value::as_object) else {
        found.skipped += 1;
        return;
    };
    let foreground = settings.get("foreground").and_then(Value::as_str).map(colour);
    if matches!(foreground, Some(None)) {
        found.skipped += 1;
        return;
    }
    let foreground = foreground.flatten();
    let font_style = settings
        .get("fontStyle")
        .and_then(Value::as_str)
        .map(|style| style.split_whitespace().filter(|word| FONT_STYLES.contains(word)).collect::<Vec<_>>().join(" "));
    let scope: Option<Vec<String>> = match entry.get("scope") {
        None => None,
        Some(Value::String(text)) => {
            Some(text.split(',').map(|s| s.trim().to_owned()).filter(|s| !s.is_empty()).collect())
        }
        Some(Value::Array(items)) => {
            Some(items.iter().filter_map(Value::as_str).map(|s| s.trim().to_owned()).collect())
        }
        Some(_) => {
            found.skipped += 1;
            return;
        }
    };
    let Some(scope) = scope else {
        // A rule with no scope is the theme's colour for code no rule names, as VS Code reads it.
        if let (Some((plain, alpha)), None) = (&foreground, &found.plain) {
            found.plain = Some(plain.clone());
            found.see_through += usize::from(*alpha);
        }
        return;
    };
    let scope: Vec<String> = scope.into_iter().filter(|s| selector_ok(s)).collect();
    if scope.is_empty() || (foreground.is_none() && font_style.is_none()) {
        found.skipped += 1;
        return;
    }
    if let Some((_, alpha)) = &foreground {
        found.see_through += usize::from(*alpha);
    }
    found.rules.push(Rule { scope, foreground: foreground.map(|(c, _)| c), font_style });
}

/// A short id for a set of code colours, from its name: lower-case letters, digits and dashes.
pub fn id_for(name: &str) -> String {
    let mut id = String::new();
    for c in name.to_lowercase().chars() {
        if c.is_ascii_alphanumeric() {
            id.push(c);
        } else if !id.ends_with('-') {
            id.push('-');
        }
    }
    let id: String = id.trim_matches('-').chars().take(60).collect();
    let id = id.trim_end_matches('-').to_owned();
    if id.len() >= 3 { id } else { format!("{}-code", if id.is_empty() { "my" } else { &id }) }
}

/// A VS Code theme read whole: `file` first, then each file it builds on, through `read`, which is given a file's name in the
/// same folder and answers its text. Later rules win, as in VS Code, so the files built on come first. `label` names the set when
/// the person chose it from a list (the label VS Code shows); otherwise the theme's own name, or its file's.
pub fn from_vscode(
    file: &str,
    label: Option<&str>,
    read: &mut dyn FnMut(&str) -> Result<String, String>,
) -> Result<CodeColours, String> {
    let mut chain: Vec<(String, OneFile)> = Vec::new();
    let mut next = Some(file.to_owned());
    while let Some(name) = next.take() {
        if chain.iter().any(|(seen, _)| seen.eq_ignore_ascii_case(&name)) {
            return Err(format!("{name} is built on by a file it builds on itself, so it was not brought in"));
        }
        if chain.len() == MAX_FILES {
            return Err(format!("{file} builds on more than {} other files, so it was not brought in", MAX_FILES - 1));
        }
        let one = read_one(&read(&name)?, &name)?;
        next = one.include.clone();
        chain.push((name, one));
    }
    let mut rules = Vec::new();
    for (_, one) in chain.iter().rev() {
        rules.extend(one.rules.iter().cloned());
    }
    if rules.is_empty() {
        let elsewhere = chain.iter().find_map(|(_, one)| one.elsewhere.clone());
        return Err(match elsewhere {
            Some(other) => format!("{file} keeps its code colours in another file, {other:?}, which is not read"),
            None => format!("{file} gives no colours for code"),
        });
    }
    if rules.len() > MAX_RULES {
        return Err(format!("{file} gives more than {MAX_RULES} colour rules, so it was not brought in"));
    }
    let top = &chain[0].1;
    let name = label
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.chars().take(MAX_NAME).collect())
        .or_else(|| top.name.clone())
        .unwrap_or_else(|| file.trim_end_matches(".json").to_owned());
    let mut notes = Vec::new();
    if chain.len() > 1 {
        let built: Vec<&str> = chain[1..].iter().map(|(n, _)| n.as_str()).collect();
        notes.push(format!("It builds on {}, read from the same folder.", built.join(" and ")));
    }
    let skipped: usize = chain.iter().map(|(_, one)| one.skipped).sum();
    if skipped > 0 {
        notes.push(format!("{skipped} of its rules were left out: they named no colour or style that can be read."));
    }
    let see_through: usize = chain.iter().map(|(_, one)| one.see_through).sum();
    if see_through > 0 {
        notes.push(format!(
            "{see_through} of its colours are partly see-through in VS Code; here they are drawn solid."
        ));
    }
    if chain.iter().any(|(_, one)| one.semantic) {
        notes.push(
            "Its semantic colours are not used: they come from a language server, which the code viewer does not run."
                .into(),
        );
    }
    Ok(CodeColours {
        schema_version: SCHEMA_VERSION,
        id: id_for(&name),
        name,
        from: file.to_owned(),
        kind: chain.iter().find_map(|(_, one)| one.kind.clone()),
        plain: chain.iter().find_map(|(_, one)| one.plain.clone()),
        rules,
        notes,
    })
}

/// Reads a theme file and the files it builds on from the file's own folder, each at most `MAX_BYTES`.
pub fn read_file(path: &Path, label: Option<&str>) -> Result<CodeColours, String> {
    let folder = path.parent().ok_or("a theme is read from a full path")?.to_path_buf();
    let file = path.file_name().map(|n| n.to_string_lossy().into_owned()).ok_or("a theme is read from a full path")?;
    from_vscode(&file, label, &mut |name: &str| {
        let path = folder.join(name);
        let size = fs::metadata(&path).map_err(|problem| format!("{name}: {problem}"))?.len();
        if size > MAX_BYTES as u64 {
            return Err(format!("{name} is larger than {} KB, so it is not read as a theme", MAX_BYTES / 1024));
        }
        fs::read_to_string(&path).map_err(|problem| format!("{name}: {problem}"))
    })
}

// ---------------------------------------------------------------- which kind of code a rule colours

/// The window's scope table: each role and the Dark+ selectors that take it.
fn table() -> &'static Vec<(String, Vec<String>)> {
    static TABLE: OnceLock<Vec<(String, Vec<String>)>> = OnceLock::new();
    TABLE.get_or_init(|| {
        let value: Value =
            serde_json::from_str(include_str!("../../../src/lib/code/scopeRoles.json")).unwrap_or_default();
        value["rules"]
            .as_array()
            .map(|rules| {
                rules
                    .iter()
                    .map(|rule| {
                        let role = rule["role"].as_str().unwrap_or("plain").to_owned();
                        let scopes = rule["scopes"]
                            .as_array()
                            .map(|s| s.iter().filter_map(Value::as_str).map(str::to_owned).collect())
                            .unwrap_or_default();
                        (role, scopes)
                    })
                    .collect()
            })
            .unwrap_or_default()
    })
}

fn last_part(selector: &str) -> &str {
    selector.split_whitespace().last().unwrap_or_default()
}

/// Which of the twelve code colours a rule's selectors stand for: the table's longest selector its own selectors start with, read
/// part by part as a scope is ("comment" stands for "comment.line.double-slash"). Plain when none does.
pub fn role_of(scope: &[String]) -> &'static str {
    let mut best: Option<(&'static str, usize)> = None;
    for selector in scope {
        let wanted = last_part(selector);
        for (role, selectors) in table() {
            for known in selectors {
                let known = last_part(known);
                let covers = wanted == known || wanted.starts_with(&format!("{known}."));
                if covers && best.is_none_or(|(_, length)| known.len() > length) {
                    best = Some((role.as_str(), known.len()));
                }
            }
        }
    }
    best.map_or("plain", |(role, _)| role)
}

// ---------------------------------------------------------------- kept sets, the choice, and what is used

/// A set on offer.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Offered {
    pub id: String,
    pub name: String,
    pub from: String,
    pub kind: Option<String>,
    pub rules: usize,
}

/// The set in use, its colours made readable on the theme in use.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Active {
    pub id: String,
    pub name: String,
    pub plain: String,
    pub rules: Vec<Rule>,
    /// How many colours took the theme's own, because they could not be read on it.
    pub replaced: usize,
    pub notes: Vec<String>,
}

/// Every set on offer, the choice, and the set in use (none: the theme's own code colours).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Status {
    pub chosen: String,
    pub sets: Vec<Offered>,
    pub active: Option<Active>,
    /// Kept files that could not be read, by file, with why: shown, never used.
    pub unreadable: Vec<(String, String)>,
    pub fell_back: Option<String>,
}

fn failed(path: &Path, problem: &std::io::Error) -> Failure {
    Failure::new(FailureCode::WriteFailed, format!("{}: {problem}", path.display()))
}

pub fn file_of(folder: &Path, id: &str) -> PathBuf {
    folder.join(format!("{id}.json"))
}

/// A kept set checked again, since anyone may change a file in the folder: its shape, every colour and every selector.
fn check_kept(set: &CodeColours) -> Result<(), String> {
    if set.schema_version != SCHEMA_VERSION {
        return Err(format!(
            "it is written for format {}, and this program reads {SCHEMA_VERSION}",
            set.schema_version
        ));
    }
    if !themes::valid_id(&set.id) || set.id == THEME_OWN {
        return Err(format!("its id {:?} is not one a set may have", set.id));
    }
    if set.name.trim().is_empty() || set.name.chars().count() > MAX_NAME || set.name.chars().any(char::is_control) {
        return Err("its name must be one line of up to 64 characters".into());
    }
    let solid = |c: &str| colour(c).is_some_and(|(given, alpha)| !alpha && given == c);
    if set.plain.as_deref().is_some_and(|c| !solid(c)) || set.rules.len() > MAX_RULES {
        return Err("it holds something other than code colours".into());
    }
    for rule in &set.rules {
        let style_ok =
            rule.font_style.as_deref().is_none_or(|s| s.split_whitespace().all(|w| FONT_STYLES.contains(&w)));
        if rule.scope.is_empty()
            || !rule.scope.iter().all(|s| selector_ok(s))
            || rule.foreground.as_deref().is_some_and(|c| !solid(c))
            || !style_ok
        {
            return Err("it holds something other than code colours".into());
        }
    }
    Ok(())
}

fn kept(folder: &Path) -> (Vec<CodeColours>, Vec<(String, String)>) {
    let (mut found, mut unreadable) = (Vec::new(), Vec::new());
    let Ok(entries) = fs::read_dir(folder) else { return (found, unreadable) };
    let mut paths: Vec<PathBuf> = entries.filter_map(Result::ok).map(|e| e.path()).collect();
    paths.sort();
    for path in paths {
        let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
        if !name.ends_with(".json") || name == CHOICE {
            continue;
        }
        let read = fs::read_to_string(&path)
            .map_err(|problem| problem.to_string())
            .and_then(|text| serde_json::from_str::<CodeColours>(&text).map_err(|problem| problem.to_string()))
            .and_then(|set| check_kept(&set).map(|()| set));
        match read {
            Ok(set) if file_of(folder, &set.id) == path => found.push(set),
            Ok(set) => unreadable.push((name, format!("it holds {}, so its file should be {}.json", set.id, set.id))),
            Err(why) => unreadable.push((name, why)),
        }
    }
    (found, unreadable)
}

fn chosen_id(folder: &Path) -> String {
    fs::read_to_string(folder.join(CHOICE))
        .ok()
        .and_then(|text| serde_json::from_str::<Value>(&text).ok())
        .and_then(|value| value["chosen"].as_str().map(str::to_owned))
        .unwrap_or_else(|| THEME_OWN.to_owned())
}

fn write_choice(folder: &Path, id: &str) -> Result<(), Failure> {
    crate::prefs::write_json(&folder.join(CHOICE), &serde_json::json!({ "chosen": id }))
}

/// Whether a colour reads on everything code is drawn on in `theme`.
fn reads_on(theme: &Theme, colour: &str) -> bool {
    themes::CODE_GROUNDS
        .iter()
        .all(|ground| themes::contrast(colour, &themes::code_ground(theme, ground)) >= themes::TEXT_MIN)
}

/// A kept set made ready for `theme`: each colour that cannot be read on it takes the theme's own for that kind of code.
pub fn resolve(set: &CodeColours, theme: &Theme) -> Active {
    let mut replaced = 0;
    let own_plain = theme.colour("code_plain").to_owned();
    let plain = match &set.plain {
        Some(plain) if reads_on(theme, plain) => plain.clone(),
        Some(_) => {
            replaced += 1;
            own_plain
        }
        None => own_plain,
    };
    let rules = set
        .rules
        .iter()
        .map(|rule| {
            let mut rule = rule.clone();
            if let Some(foreground) = &rule.foreground
                && !reads_on(theme, foreground)
            {
                replaced += 1;
                rule.foreground = Some(theme.colour(&format!("code_{}", role_of(&rule.scope))).to_owned());
            }
            rule
        })
        .collect();
    Active { id: set.id.clone(), name: set.name.clone(), plain, rules, replaced, notes: set.notes.clone() }
}

/// Every set on offer and the one in use, made ready for `theme`. `folder` need not exist yet.
pub fn status(folder: &Path, theme: &Theme) -> Status {
    let (sets, unreadable) = kept(folder);
    let chosen = chosen_id(folder);
    let found = sets.iter().find(|set| set.id == chosen);
    let fell_back = match (chosen.as_str(), found) {
        (THEME_OWN, _) | (_, Some(_)) => None,
        _ => Some(match unreadable.iter().find(|(file, _)| *file == format!("{chosen}.json")) {
            Some((_, why)) => format!("the code colours {chosen} could not be used: {why}"),
            None => format!("the code colours {chosen} are no longer here"),
        }),
    };
    Status {
        active: found.map(|set| resolve(set, theme)),
        sets: sets
            .iter()
            .map(|set| Offered {
                id: set.id.clone(),
                name: set.name.clone(),
                from: set.from.clone(),
                kind: set.kind.clone(),
                rules: set.rules.len(),
            })
            .collect(),
        chosen,
        unreadable,
        fell_back,
    }
}

/// Uses a kept set from now on, or the theme's own code colours (`THEME_OWN`).
pub fn choose(folder: &Path, id: &str, theme: &Theme) -> Result<Status, Failure> {
    if id != THEME_OWN && !kept(folder).0.iter().any(|set| set.id == id) {
        return Err(Failure::refused(format!("there are no code colours {id} to use")));
    }
    write_choice(folder, id)?;
    Ok(status(folder, theme))
}

/// Keeps a set read from a VS Code theme, and uses it. A set with the same id is replaced: the same theme brought in again.
pub fn keep(folder: &Path, set: &CodeColours, theme: &Theme) -> Result<Status, Failure> {
    check_kept(set).map_err(Failure::refused)?;
    fs::create_dir_all(folder).map_err(|problem| failed(folder, &problem))?;
    let path = file_of(folder, &set.id);
    let fresh = path.with_extension("json.new");
    let text = serde_json::to_string_pretty(set).unwrap_or_default() + "\n";
    fs::write(&fresh, text).map_err(|problem| failed(&fresh, &problem))?;
    fs::rename(&fresh, &path).map_err(|problem| failed(&path, &problem))?;
    write_choice(folder, &set.id)?;
    Ok(status(folder, theme))
}

/// Takes a kept set away; when it was in use, the theme's own code colours are used again.
pub fn remove(folder: &Path, id: &str, theme: &Theme) -> Result<Status, Failure> {
    if id == THEME_OWN || !themes::valid_id(id) {
        return Err(Failure::refused(format!("{id:?} is not a set of code colours that can be removed")));
    }
    let path = file_of(folder, id);
    match fs::remove_file(&path) {
        Ok(()) => {}
        Err(problem) if problem.kind() == ErrorKind::NotFound => {
            return Err(Failure::refused(format!("there are no code colours {id} to remove")));
        }
        Err(problem) => return Err(failed(&path, &problem)),
    }
    if chosen_id(folder) == id {
        write_choice(folder, THEME_OWN)?;
    }
    Ok(status(folder, theme))
}

// ---------------------------------------------------------------- VS Code's themes on this computer

/// A colour theme an installed VS Code (or an editor built from it) offers.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Installed {
    /// The name VS Code shows for it.
    pub label: String,
    /// The extension that brings it: "Default Themes" for VS Code's own.
    pub extension: String,
    /// dark, light, or high contrast, from the extension's own word for it.
    pub kind: String,
    pub file: String,
}

fn read_small(path: &Path) -> Option<String> {
    let size = fs::metadata(path).ok()?.len();
    (size <= MAX_MANIFEST).then(|| fs::read_to_string(path).ok()).flatten()
}

/// A `%key%` label read from the extension's `package.nls.json`, as VS Code shows it.
fn label_of(text: &str, words: &Map<String, Value>) -> String {
    let key = text.strip_prefix('%').and_then(|t| t.strip_suffix('%'));
    key.and_then(|k| words.get(k)).and_then(Value::as_str).unwrap_or(text).trim().to_owned()
}

fn kind_of(ui_theme: &str) -> &'static str {
    match ui_theme {
        "vs" => "light",
        "hc-black" | "hc-light" => "high contrast",
        _ => "dark",
    }
}

/// Every colour theme in the extension folders under `roots` (each a folder of extensions, as VS Code keeps them). Only `.json`
/// themes inside their own extension's folder are listed; a root that is missing is passed over.
pub fn installed(roots: &[PathBuf]) -> Vec<Installed> {
    let mut found = Vec::new();
    let mut seen = BTreeSet::new();
    for root in roots {
        let Ok(entries) = fs::read_dir(root) else { continue };
        let mut folders: Vec<PathBuf> =
            entries.filter_map(Result::ok).map(|e| e.path()).filter(|p| p.is_dir()).collect();
        folders.sort();
        for folder in folders {
            let Some(manifest) = read_small(&folder.join("package.json")) else { continue };
            let Ok(manifest) = serde_json::from_str::<Value>(&strip_jsonc(&manifest)) else { continue };
            let Some(themes) = manifest["contributes"]["themes"].as_array() else { continue };
            let words = read_small(&folder.join("package.nls.json"))
                .and_then(|text| serde_json::from_str::<Value>(&strip_jsonc(&text)).ok())
                .and_then(|value| value.as_object().cloned())
                .unwrap_or_default();
            let extension = manifest["displayName"]
                .as_str()
                .or(manifest["name"].as_str())
                .map(|name| label_of(name, &words))
                .unwrap_or_default();
            let Ok(home) = folder.canonicalize() else { continue };
            for theme in themes {
                let (Some(label), Some(path)) = (theme["label"].as_str(), theme["path"].as_str()) else { continue };
                if !path.to_ascii_lowercase().ends_with(".json") {
                    continue;
                }
                let Ok(file) = folder.join(path).canonicalize() else { continue };
                if !file.starts_with(&home) || !file.is_file() || !seen.insert(file.clone()) {
                    continue;
                }
                found.push(Installed {
                    label: label_of(label, &words),
                    extension: extension.clone(),
                    kind: kind_of(theme["uiTheme"].as_str().unwrap_or_default()).to_owned(),
                    file: file.display().to_string(),
                });
                if found.len() == MAX_INSTALLED {
                    return found;
                }
            }
        }
    }
    found.sort_by(|a, b| a.label.to_lowercase().cmp(&b.label.to_lowercase()).then(a.file.cmp(&b.file)));
    found
}

#[cfg(test)]
#[path = "tests/code_colours.rs"]
mod tests;
