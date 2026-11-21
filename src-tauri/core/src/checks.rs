//! Checks on what the window asks for, before the tool kit sees it. The kit checks again; these keep a malformed or hostile
//! request from ever becoming a command line. Each returns whether the text is acceptable; callers refuse in words.

const CHANGELOG_NAME: &str = "CHANGELOG.md";
pub const MAX_PATH: usize = 300;
pub const MAX_NAME: usize = 120;
pub const MAX_MOMENT: usize = 40;
pub const MAX_KEY: usize = 64;
pub const MAX_VALUE: usize = 500;

/// A changelog's path inside a repository: relative, forward slashes, no step upwards, ending in the changelog's file name.
/// Folder names may hold spaces, as some games' mod folders do.
pub fn changelog_path(path: &str) -> bool {
    !path.is_empty()
        && path.len() <= MAX_PATH
        && !path.starts_with(['/', '-'])
        && !path.contains(['\\', ':', '\0', '\n', '\r'])
        && path.split('/').all(|part| !part.is_empty() && part != "." && part != "..")
        && path.rsplit('/').next() == Some(CHANGELOG_NAME)
}

/// A file's path inside a repository, as git names it (0.50.0): relative, forward slashes, no step upwards, nothing that could
/// read as an option or a revision.
pub fn repository_file(path: &str) -> bool {
    !path.is_empty()
        && path.len() <= MAX_PATH
        && !path.starts_with(['/', '-'])
        && !path.contains(['\\', ':', '\0', '\n', '\r'])
        && path.split('/').all(|part| !part.is_empty() && part != "." && part != "..")
}

/// A commit's hash: 7 to 40 lower-case hexadecimal characters.
pub fn commit_hash(text: &str) -> bool {
    (7..=40).contains(&text.len()) && text.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

/// A moment as the kit's facts write it: an ISO date or time, digits and the few marks between them.
pub fn moment(text: &str) -> bool {
    !text.is_empty()
        && text.len() <= MAX_MOMENT
        && text.as_bytes()[0].is_ascii_digit()
        && text.bytes().all(|b| b.is_ascii_digit() || b"-:T+Z.".contains(&b))
}

/// A mod's folder name, a backup's or a package ID: letters, digits, dots, dashes and underscores, never starting with either.
pub fn plain_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= MAX_NAME
        && !name.starts_with(['-', '.'])
        && name.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
}

/// A setting's name: letters and digits only, as the kit's keys are.
pub fn setting_key(key: &str) -> bool {
    !key.is_empty() && key.len() <= MAX_KEY && key.bytes().all(|b| b.is_ascii_alphanumeric())
}

/// A setting's value to write: one line, of a sane length, not read as an option. The kit checks it is a full path.
pub fn setting_value(value: &str) -> bool {
    let value = value.trim();
    !value.is_empty()
        && value.chars().count() <= MAX_VALUE
        && !value.starts_with('-')
        && !value.contains(['\n', '\r', '\0'])
}

/// Text folded onto one line: every run of spaces and line breaks becomes one space.
pub fn one_line(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
#[path = "tests/checks.rs"]
mod tests;

pub const MAX_NODE: usize = 400;
pub const MAX_PATTERN: usize = 120;

/// A thing's id in the tools' connections: a language prefix (cs, def, lua, py), a colon, and one line of text.
pub fn node_id(id: &str) -> bool {
    let known = ["cs:", "def:", "lua:", "py:"].iter().any(|prefix| id.starts_with(prefix));
    known && id.len() <= MAX_NODE && !id.contains(['\n', '\r', '\0'])
}

/// A name or pattern to search for: one line, of a sane length, not empty.
pub fn search_pattern(text: &str) -> bool {
    let text = text.trim();
    !text.is_empty() && text.chars().count() <= MAX_PATTERN && !text.contains(['\n', '\r', '\0'])
}

pub const MAX_LABEL: usize = 80;
pub const MAX_TYPE_NAME: usize = 400;
pub const MAX_ADDRESS_DIGITS: usize = 16;

/// A few words a person gives something to find it by later (a memory watch, a snapshot): folded onto one line, at most
/// `MAX_LABEL` characters, or the words that refuse it.
pub fn label(text: &str) -> Result<String, String> {
    let label = one_line(text);
    if label.chars().count() > MAX_LABEL {
        return Err(format!("keep the label under {MAX_LABEL} characters"));
    }
    Ok(label)
}

/// A .NET type's full name as a snapshot of a running program writes it: one line of letters, digits and the marks a type's name
/// holds (`.` `_` `+` `<` `>` `,` `[` `]`, the backtick of a generic's count, and the space after a comma), such as
/// `System.Collections.Generic.Dictionary<System.String, Verse.Def>` or `Sounds+RegionCall[]`.
pub fn type_name(text: &str) -> bool {
    !text.is_empty()
        && text.chars().count() <= MAX_TYPE_NAME
        && !text.starts_with([' ', '-'])
        && text.chars().all(|c| c.is_alphanumeric() || "._+<>,[]` ".contains(c))
}

/// A memory address as a snapshot writes it: `0x` and one to sixteen hexadecimal digits.
pub fn memory_address(text: &str) -> bool {
    text.strip_prefix("0x").is_some_and(|digits| {
        (1..=MAX_ADDRESS_DIGITS).contains(&digits.len()) && digits.bytes().all(|b| b.is_ascii_hexdigit())
    })
}
