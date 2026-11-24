//! Sorting a command an agent wants to run (0.84.0; `docs/ai.md`, "Commands"; the owner's choices by card, 25 Nov 2026: three
//! modes starting on Ask, reading commands, the tool kit's read-only reports and tests running by themselves in Automatic, a card
//! that can allow a command for the rest of a chat, and the agent's own permission questions sorted the same way). Game-free.
//!
//! A command is read the way a shell reads it: split at `&&`, `||`, `;`, `|` and new lines, each part's words and redirections
//! found, quotes honoured, and the text inside `bash -c "…"` and the like read the same way. Each part is judged by the rules in
//! `config/chat-commands.json`, tried in order, the first that names it deciding: **forbidden** (refused even with a yes: what the
//! shared rules forbid agents), **tests**, **reads**, or **changes**. A part no rule names, a part whose words hide another
//! command (`$(…)`, backticks), or one that writes its output into a file, changes. A `cd` moves where later parts' paths are
//! judged from.
//!
//! **The honest limit: this reads text; it is not a sandbox.** Only commands that plainly read, test or ask the kit's reports that
//! read can run by themselves, and a path outside the repository, or one whose value is not in the text (`$HOME`), makes a
//! reading ask.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Component, Path, PathBuf};
use std::sync::OnceLock;

const RULES: &str = include_str!("../../../config/chat-commands.json");
/// The longest command sorted; a longer one asks.
pub const MAX_COMMAND: usize = 8_000;
const MAX_PARTS: usize = 32;
/// How many shells inside shells are looked into (`bash -c "pwsh -c '…'"`).
const MAX_DEPTH: usize = 3;
/// Where an output redirection may point without writing anything.
const NOWHERE: [&str; 7] = ["/dev/null", "$null", "nul", "nul:", "&1", "&2", "-"];

/// How the Chat page handles an agent's commands, chosen in Settings → AI. **It starts on Ask** (the owner's choice).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    /// No command through the Companion; the agent's own permission questions come to the person, a forbidden one refused.
    Refused,
    /// Every command is shown and runs only on the person's press.
    #[default]
    Ask,
    /// A command that only reads or tests runs by itself; one that changes something asks; a forbidden one is refused.
    Automatic,
}

impl Mode {
    pub fn parse(text: &str) -> Option<Self> {
        match text {
            "refused" => Some(Self::Refused),
            "ask" => Some(Self::Ask),
            "automatic" => Some(Self::Automatic),
            _ => None,
        }
    }

    /// Whether the agent is offered a terminal through the Companion.
    pub fn offers_terminal(self) -> bool {
        self != Self::Refused
    }
}

/// What one part of a command does, as its rule says.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Reads,
    Tests,
    Changes,
    Forbidden,
}

/// What happens to a command.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Tier {
    Runs,
    Asks,
    Refused,
}

/// A command sorted: its tier, why (each a short id the window turns into words, such as `reads`, `deletes` or `force-push`, in
/// the order its parts gave them), and whether it is one to look at twice (it may throw work away, delete or install).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Sorted {
    pub tier: Tier,
    pub why: Vec<String>,
    pub warn: bool,
}

#[derive(Debug, Clone, Deserialize)]
struct Rule {
    #[serde(default)]
    programs: Vec<String>,
    sub: Option<Vec<String>>,
    then: Option<Vec<String>>,
    #[serde(default)]
    any: Vec<String>,
    #[serde(default)]
    all: Vec<String>,
    #[serde(default)]
    none: Vec<String>,
    #[serde(default)]
    bare: bool,
    #[serde(default)]
    paths: bool,
    kind: Option<Kind>,
    why: Option<String>,
    #[serde(default)]
    warn: bool,
    #[serde(default)]
    kit: bool,
}

#[derive(Debug, Clone, Deserialize)]
struct KitRule {
    programs: Vec<String>,
    module: String,
}

/// The rules, checked and in lower case.
#[derive(Debug, Clone, Deserialize)]
pub struct Rules {
    environment: Vec<String>,
    shells: HashMap<String, Vec<String>>,
    #[serde(default)]
    valued: HashMap<String, Vec<String>>,
    kit: KitRule,
    rules: Vec<Rule>,
}

fn lower(list: &mut [String]) {
    for item in list {
        *item = item.to_lowercase();
    }
}

/// The rules a file gives, checked: each is either the kit's place in the order, or names programs, a kind and why.
pub fn checked_rules(text: &str) -> Result<Rules, String> {
    let mut rules: Rules =
        serde_json::from_str(text).map_err(|e| format!("the command rules could not be read: {e}"))?;
    for (at, rule) in rules.rules.iter_mut().enumerate() {
        if !rule.kit
            && (rule.programs.is_empty() || rule.kind.is_none() || rule.why.as_deref().is_none_or(str::is_empty))
        {
            return Err(format!("command rule {} names no programs, kind or why", at + 1));
        }
        lower(&mut rule.programs);
        for list in [&mut rule.any, &mut rule.all, &mut rule.none] {
            lower(list);
        }
        for list in [rule.sub.as_mut(), rule.then.as_mut()].into_iter().flatten() {
            lower(list);
        }
    }
    for flags in rules.shells.values_mut() {
        lower(flags);
    }
    for options in rules.valued.values_mut() {
        lower(options);
    }
    lower(&mut rules.kit.programs);
    rules.environment.iter_mut().for_each(|name| *name = name.to_uppercase());
    Ok(rules)
}

/// The shipped rules. A shipped file that could not be read sorts every command as asking (a test holds the file readable).
pub fn rules() -> &'static Rules {
    static FOUND: OnceLock<Rules> = OnceLock::new();
    FOUND.get_or_init(|| {
        checked_rules(RULES).unwrap_or_else(|_| Rules {
            environment: Vec::new(),
            shells: HashMap::new(),
            valued: HashMap::new(),
            kit: KitRule { programs: Vec::new(), module: String::new() },
            rules: Vec::new(),
        })
    })
}

/// What each of the kit's reports does, from its manifest: (command, report) to its effect (`reads`, `writes`, `runs`,
/// `reads-online`, `owner-press`…); a command's one unnamed report under "".
pub type KitEffects = HashMap<(String, String), String>;

pub fn kit_effects(manifest: &Value) -> KitEffects {
    let mut found = KitEffects::new();
    for command in manifest["data"]["commands"].as_array().map_or(&[][..], Vec::as_slice) {
        let Some(name) = command["name"].as_str() else { continue };
        for report in command["reports"].as_array().map_or(&[][..], Vec::as_slice) {
            let report_name = report["name"].as_str().unwrap_or_default();
            if let Some(effect) = report["effect"].as_str() {
                found.insert((name.to_owned(), report_name.to_owned()), effect.to_owned());
            }
        }
    }
    found
}

/// The words of a command as one line, each quoted where a shell would need it: how a command through the Companion is shown,
/// sorted and remembered.
pub fn joined(program: &str, args: &[String]) -> String {
    std::iter::once(program).chain(args.iter().map(String::as_str)).map(quoted).collect::<Vec<_>>().join(" ")
}

fn quoted(word: &str) -> String {
    let plain = !word.is_empty() && word.chars().all(|c| c.is_alphanumeric() || "-_./\\:=+,@%^*?[]{}~#".contains(c));
    if plain {
        word.to_owned()
    } else {
        format!("\"{}\"", word.replace('\\', "\\\\").replace('"', "\\\"").replace('$', "\\$").replace('`', "\\`"))
    }
}

/// A command as remembered for "allow for this chat": its words with their spacing evened out.
pub fn remembered(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// What the mode makes of a sorted command: a command that would run asks in Ask mode; refused stays refused.
pub fn decide(mode: Mode, sorted: &Sorted) -> Tier {
    match (sorted.tier, mode) {
        (Tier::Refused, _) => Tier::Refused,
        (Tier::Runs, Mode::Automatic) => Tier::Runs,
        _ => Tier::Asks,
    }
}

/// Sorts a command an agent wants to run in `cwd`, inside the repository at `root`.
pub fn sort(rules: &Rules, kit: &KitEffects, text: &str, root: &Path, cwd: &Path) -> Sorted {
    let judged = if text.len() > MAX_COMMAND {
        vec![changes("unknown", false)]
    } else {
        let place = Place { root: &plain_root(root), cwd: Some(cwd.to_path_buf()) };
        judge_text(rules, kit, text, place, 0)
    };
    let whys = |kinds: &[Kind]| {
        let mut why = Vec::new();
        for j in judged.iter().filter(|j| kinds.contains(&j.kind)) {
            if !why.contains(&j.why) {
                why.push(j.why.clone());
            }
        }
        why
    };
    let warn = judged.iter().any(|j| j.warn);
    if judged.iter().any(|j| j.kind == Kind::Forbidden) {
        Sorted { tier: Tier::Refused, why: whys(&[Kind::Forbidden]), warn: true }
    } else if judged.is_empty() || judged.iter().any(|j| j.kind == Kind::Changes) {
        let why = whys(&[Kind::Changes]);
        Sorted { tier: Tier::Asks, why: if why.is_empty() { vec!["unknown".to_owned()] } else { why }, warn }
    } else {
        Sorted { tier: Tier::Runs, why: whys(&[Kind::Reads, Kind::Tests]), warn }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct Judged {
    kind: Kind,
    why: String,
    warn: bool,
}

fn changes(why: &str, warn: bool) -> Judged {
    Judged { kind: Kind::Changes, why: why.to_owned(), warn }
}

fn forbidden(why: &str) -> Judged {
    Judged { kind: Kind::Forbidden, why: why.to_owned(), warn: true }
}

/// Where paths are judged from: the repository, and the folder a command runs in, unknown once a `cd` named one whose value is not
/// in the text.
#[derive(Clone)]
struct Place<'a> {
    root: &'a str,
    cwd: Option<PathBuf>,
}

/// The repository's path as plain text for comparing: forward slashes, no `\\?\` mark Windows gives a canonical path, no
/// trailing slash, and in lower case on Windows, whose paths ignore case.
fn plain_root(root: &Path) -> String {
    comparable(&root.to_string_lossy())
}

fn comparable(path: &str) -> String {
    let path = path.replace('\\', "/");
    let path = path.strip_prefix("//?/").unwrap_or(&path).trim_end_matches('/').to_owned();
    if cfg!(windows) { path.to_lowercase() } else { path }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Where {
    Inside,
    Outside,
    Unknown,
}

/// Where a path a command names is: inside the repository, outside it, or not known from the text.
fn place_of(place: &Place, word: &Word) -> Where {
    if !word.plain {
        return Where::Unknown;
    }
    let Some(cwd) = &place.cwd else { return Where::Unknown };
    let mut text = word.text.replace('\\', "/");
    // Git's own shell on Windows writes a drive as /c/…
    if cfg!(windows) {
        let bytes = text.as_bytes();
        if bytes.len() >= 2
            && bytes[0] == b'/'
            && bytes[1].is_ascii_alphabetic()
            && (bytes.len() == 2 || bytes[2] == b'/')
        {
            text = format!("{}:/{}", bytes[1] as char, text.get(3..).unwrap_or_default());
        }
    }
    let path = Path::new(&text);
    let full = if path.is_absolute() || (cfg!(windows) && text.get(1..2) == Some(":")) {
        path.to_path_buf()
    } else {
        cwd.join(path)
    };
    let mut parts: Vec<Component> = Vec::new();
    for component in full.components() {
        match component {
            Component::ParentDir => {
                if matches!(parts.last(), Some(Component::Normal(_))) {
                    parts.pop();
                } else {
                    return Where::Outside;
                }
            }
            Component::CurDir => {}
            other => parts.push(other),
        }
    }
    let normal: PathBuf = parts.iter().collect();
    let found = comparable(&normal.to_string_lossy());
    if found == place.root || found.starts_with(&format!("{}/", place.root)) { Where::Inside } else { Where::Outside }
}

// ---------------------------------------------------------------- reading a command as a shell does

#[derive(Debug, Clone, PartialEq, Eq)]
struct Word {
    text: String,
    /// No value of a variable, no home folder: the text is what the shell would use.
    plain: bool,
}

#[derive(Debug, Default)]
struct Simple {
    words: Vec<Word>,
    /// Each redirection's target, and whether it writes (`>`) or reads (`<`).
    redirects: Vec<(Word, bool)>,
}

#[derive(Debug, Default)]
struct Split {
    parts: Vec<Simple>,
    /// Another command hides inside: `$(…)`, backticks, `<(…)`.
    hidden: bool,
}

struct Reader {
    split: Split,
    part: Simple,
    word: String,
    started: bool,
    plain: bool,
    /// A redirection waiting for its target: whether it writes.
    pending: Option<bool>,
}

impl Reader {
    fn end_word(&mut self) {
        if self.started {
            let word = Word { text: std::mem::take(&mut self.word), plain: self.plain };
            match self.pending.take() {
                Some(writes) => self.part.redirects.push((word, writes)),
                None => self.part.words.push(word),
            }
        }
        self.started = false;
        self.plain = true;
    }

    fn end_part(&mut self) {
        self.end_word();
        if !self.part.words.is_empty() || !self.part.redirects.is_empty() {
            self.split.parts.push(std::mem::take(&mut self.part));
        }
    }

    fn push(&mut self, c: char) {
        self.word.push(c);
        self.started = true;
    }
}

const ESCAPED: &str = " \t\"';&|<>()\\$`";

/// A command's text split into its parts; None when its quotes do not close or a redirection has no target.
fn split(text: &str) -> Option<Split> {
    let chars: Vec<char> = text.chars().collect();
    let mut r = Reader {
        split: Split::default(),
        part: Simple::default(),
        word: String::new(),
        started: false,
        plain: true,
        pending: None,
    };
    let mut quote: Option<char> = None;
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        let next = chars.get(i + 1).copied();
        match quote {
            Some('\'') => {
                if c == '\'' {
                    quote = None;
                } else {
                    r.push(c);
                }
            }
            Some(_) => {
                if c == '"' {
                    quote = None;
                } else if c == '\\' && next.is_some_and(|n| "\"\\$`".contains(n)) {
                    r.push(next.unwrap_or_default());
                    i += 1;
                } else {
                    if c == '`' || (c == '$' && next == Some('(')) {
                        r.split.hidden = true;
                    }
                    if c == '$' {
                        r.plain = false;
                    }
                    r.push(c);
                }
            }
            None => match c {
                ' ' | '\t' | '\r' => r.end_word(),
                '\'' | '"' => {
                    quote = Some(c);
                    r.started = true;
                }
                '\\' if next.is_some_and(|n| ESCAPED.contains(n)) => {
                    r.push(next.unwrap_or_default());
                    i += 1;
                }
                '`' => {
                    r.split.hidden = true;
                    r.push(c);
                }
                '$' => {
                    if next == Some('(') {
                        r.split.hidden = true;
                    }
                    r.plain = false;
                    r.push(c);
                }
                '~' if !r.started => {
                    r.plain = false;
                    r.push(c);
                }
                '<' | '>' => {
                    if next == Some('(') {
                        r.split.hidden = true;
                    }
                    // A file number before the sign (2>) is part of the sign, not a word.
                    if r.started && r.word.chars().all(|d| d.is_ascii_digit()) {
                        r.word.clear();
                        r.started = false;
                    }
                    r.end_word();
                    let writes = c == '>';
                    while matches!(chars.get(i + 1), Some('>') | Some('|')) {
                        i += 1;
                    }
                    if chars.get(i + 1) == Some(&'&') {
                        // >&2, >&1: to another of the command's own outputs.
                        i += 1;
                        while chars.get(i + 1).is_some_and(char::is_ascii_digit) {
                            i += 1;
                        }
                    } else {
                        r.pending = Some(writes);
                    }
                }
                ';' | '\n' | '(' | ')' => r.end_part(),
                '&' => {
                    if next == Some('>') {
                        // &> writes both outputs into a file.
                        r.end_word();
                        i += 1;
                        while chars.get(i + 1) == Some(&'>') {
                            i += 1;
                        }
                        r.pending = Some(true);
                    } else {
                        if next == Some('&') {
                            i += 1;
                        }
                        r.end_part();
                    }
                }
                '|' => {
                    if next == Some('|') {
                        i += 1;
                    }
                    r.end_part();
                }
                _ => r.push(c),
            },
        }
        i += 1;
    }
    if quote.is_some() {
        return None;
    }
    r.end_word();
    if r.pending.is_some() {
        return None;
    }
    r.end_part();
    Some(r.split)
}

// ---------------------------------------------------------------- judging

fn judge_text(rules: &Rules, kit: &KitEffects, text: &str, mut place: Place, depth: usize) -> Vec<Judged> {
    let Some(found) = split(text) else { return vec![changes("unknown", false)] };
    if found.parts.len() > MAX_PARTS {
        return vec![changes("unknown", false)];
    }
    let mut judged = Vec::new();
    if found.hidden {
        judged.push(changes("hidden-command", true));
    }
    for part in &found.parts {
        judged.extend(judge_part(rules, kit, part, &mut place, depth));
    }
    judged
}

/// A program's name as rules name it: its file name, in lower case, without `.exe`, `.cmd` or `.bat`.
fn program_name(word: &str) -> String {
    let name = word.replace('\\', "/");
    let name = name.rsplit('/').next().unwrap_or_default().to_lowercase();
    for ending in [".exe", ".cmd", ".bat", ".com"] {
        if let Some(bare) = name.strip_suffix(ending) {
            return bare.to_owned();
        }
    }
    name
}

fn environment_name(word: &str) -> Option<&str> {
    let (name, _) = word.split_once('=')?;
    let mut chars = name.chars();
    let first = chars.next()?;
    ((first.is_ascii_alphabetic() || first == '_') && chars.all(|c| c.is_ascii_alphanumeric() || c == '_'))
        .then_some(name)
}

fn judge_part(rules: &Rules, kit: &KitEffects, part: &Simple, place: &mut Place, depth: usize) -> Vec<Judged> {
    let mut judged = Vec::new();
    for (target, writes) in &part.redirects {
        if *writes {
            if NOWHERE.contains(&target.text.to_lowercase().as_str()) {
                continue;
            }
            if is_save(rules, &target.text) {
                judged.push(forbidden("saves"));
                continue;
            }
            judged.push(match place_of(place, target) {
                Where::Outside => forbidden("outside-repository"),
                Where::Unknown => changes("writes-output", true),
                Where::Inside => changes("writes-output", false),
            });
        } else if place_of(place, target) != Where::Inside {
            judged.push(changes("reads-outside", false));
        }
    }
    let mut words = &part.words[..];
    while let Some(first) = words.first().filter(|w| environment_name(&w.text).is_some()) {
        let name = environment_name(&first.text).unwrap_or_default().to_uppercase();
        if !rules.environment.contains(&name) {
            judged.push(changes("sets-environment", true));
        }
        words = &words[1..];
    }
    let Some(first) = words.first() else { return judged };
    let program = program_name(&first.text);
    let args = &words[1..];
    // A shell given a command as text: that text is read the same way.
    if let Some(flags) = rules.shells.get(&program)
        && let Some(at) = args.iter().position(|a| flags.contains(&a.text.to_lowercase()))
    {
        return match args.get(at + 1) {
            Some(inner) if depth < MAX_DEPTH => {
                judged.extend(judge_text(rules, kit, &inner.text, place.clone(), depth + 1));
                judged
            }
            _ => {
                judged.push(changes("unknown", false));
                judged
            }
        };
    }
    let found = judge_words(rules, kit, &program, args, place);
    // A cd moves where the parts after it are judged from.
    if matches!(program.as_str(), "cd" | "set-location" | "sl" | "pushd" | "chdir") {
        place.cwd = match args.iter().find(|a| !a.text.starts_with('-')) {
            Some(target) if target.plain => place.cwd.as_ref().map(|cwd| cwd.join(target.text.replace('\\', "/"))),
            Some(_) => None,
            None => place.cwd.clone(),
        };
    }
    judged.push(found);
    judged
}

fn is_save(rules: &Rules, text: &str) -> bool {
    let word = text.replace('\\', "/").to_lowercase();
    rules
        .rules
        .iter()
        .filter(|r| r.why.as_deref() == Some("saves"))
        .any(|r| r.any.iter().any(|pattern| matches(pattern, &word)))
}

/// A word against a rule's pattern: `x*` begins, `*x` ends, `*x*` holds, anything else is the word itself.
fn matches(pattern: &str, word: &str) -> bool {
    match (pattern.strip_prefix('*'), pattern.strip_suffix('*')) {
        (Some(_), Some(_)) if pattern.len() >= 2 => word.contains(&pattern[1..pattern.len() - 1]),
        (Some(end), None) => word.ends_with(end),
        (None, Some(start)) => word.starts_with(start),
        _ => word == pattern,
    }
}

/// An option, as opposed to a word the command works on: `-x`, `--x`, and on Windows `/x` alone.
fn is_option(word: &str) -> bool {
    (word.starts_with('-') && word.len() > 1)
        || (word.len() == 2 && word.starts_with('/') && word.as_bytes()[1].is_ascii_alphabetic())
}

fn judge_words(rules: &Rules, kit: &KitEffects, program: &str, args: &[Word], place: &Place) -> Judged {
    let lowered: Vec<String> = args.iter().map(|a| a.text.replace('\\', "/").to_lowercase()).collect();
    let valued = rules.valued.get(program).map_or(&[][..], Vec::as_slice);
    // The words the command works on, with the values of options that take one left out.
    let mut positional: Vec<usize> = Vec::new();
    let mut skip = false;
    for (at, word) in lowered.iter().enumerate() {
        if skip {
            skip = false;
        } else if is_option(word) {
            skip = valued.contains(word);
        } else {
            positional.push(at);
        }
    }
    let nth = |n: usize| positional.get(n).map(|&at| lowered[at].as_str());
    for rule in &rules.rules {
        if rule.kit {
            if let Some(found) = judge_kit(rules, kit, program, &lowered) {
                return found;
            }
            continue;
        }
        if !rule.programs.iter().any(|p| p == "*" || p == program) {
            continue;
        }
        let fits = |list: &Option<Vec<String>>, word: Option<&str>| {
            list.as_ref().is_none_or(|list| list.iter().any(|p| matches(p, word.unwrap_or_default())))
        };
        if !fits(&rule.sub, nth(0)) || !fits(&rule.then, nth(1)) {
            continue;
        }
        let used = usize::from(rule.sub.is_some()) + usize::from(rule.then.is_some());
        if rule.bare && positional.len() > used {
            continue;
        }
        let holds = |pattern: &String| lowered.iter().any(|w| matches(pattern, w));
        if (!rule.any.is_empty() && !rule.any.iter().any(holds))
            || !rule.all.iter().all(holds)
            || rule.none.iter().any(holds)
        {
            continue;
        }
        let kind = rule.kind.unwrap_or(Kind::Changes);
        let why = rule.why.clone().unwrap_or_default();
        if rule.paths {
            let places: Vec<Where> = positional.iter().skip(used).map(|&at| place_of(place, &args[at])).collect();
            match kind {
                Kind::Reads if places.iter().any(|w| *w != Where::Inside) => return changes("reads-outside", false),
                Kind::Changes if places.contains(&Where::Outside) => return forbidden("outside-repository"),
                Kind::Changes if places.contains(&Where::Unknown) => return changes(&why, true),
                _ => {}
            }
        }
        return Judged { kind, why, warn: rule.warn };
    }
    changes("unknown", false)
}

/// The kit's own reports: `python -m phobos_modkit TOOL REPORT …`, judged by what the kit's manifest says the report does.
fn judge_kit(rules: &Rules, kit: &KitEffects, program: &str, lowered: &[String]) -> Option<Judged> {
    if !rules.kit.programs.iter().any(|p| p == program) {
        return None;
    }
    let at = lowered.iter().position(|w| w == "-m")?;
    if lowered.get(at + 1)? != &rules.kit.module {
        return None;
    }
    let mut after = lowered[at + 2..].iter().filter(|w| !is_option(w));
    let tool = after.next()?.clone();
    let report = after.next().cloned().unwrap_or_default();
    let effect = kit.get(&(tool.clone(), report)).or_else(|| kit.get(&(tool, String::new())));
    Some(match effect.map(String::as_str) {
        Some("reads") => Judged { kind: Kind::Reads, why: "kit-reads".to_owned(), warn: false },
        Some("reads-online") => changes("goes-online", false),
        Some("writes" | "runs") => changes("kit-changes", false),
        Some("owner-press" | "owner-only") => forbidden("owner-only"),
        _ => changes("unknown", false),
    })
}

/// Words for the agent, in English, when a command is refused or not run: why, from the ids `sort` gives.
pub fn told(why: &[String]) -> String {
    let words: Vec<&str> = why
        .iter()
        .map(|id| match id.as_str() {
            "force-push" => "force-pushing is never done here",
            "rewrites-history" => "rewriting git history is never done here",
            "skips-checks" => "a commit or push never skips the repository's checks",
            "visibility" => "a repository's visibility is never changed here",
            "credentials" => "credentials are never read or changed here",
            "owner-only" => "only the person runs this, on its own page",
            "saves" => "the person's saves are never changed",
            "outside-repository" => "it would change something outside the repository",
            _ => "it is not one the Companion runs",
        })
        .collect();
    words.join("; ")
}

#[cfg(test)]
#[path = "tests/commands.rs"]
mod tests;
