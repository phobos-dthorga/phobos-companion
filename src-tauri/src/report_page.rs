//! Something's off, for someone without agent sessions (0.100.0; the release audit's C5; the owner's choices by card, 25 Nov 2026:
//! a GitHub issue filled in, holding their words, the page and versions, and the picture; for everyone where agent sessions aren't
//! at work). **The Companion sends nothing.** The host builds the issue from the person's words and the page's name, shows it whole
//! first, saves the picture in their Pictures folder for them to drag in, and opens GitHub's own new-issue page in their browser,
//! filled in; they read it there and press Submit, or don't.

use crate::pictures;
use companion_core::checks;
use companion_core::failure::Failure;
use companion_core::process;
use serde::Serialize;
use std::path::Path;

/// Where the Companion's own issues are, and nowhere else.
pub const ISSUES: &str = "https://github.com/phobos-dthorga/phobos-companion/issues/new";
const MAX_WORDS: usize = 2_000;
const MAX_PAGE: usize = 60;
const TITLE_WORDS: usize = 60;
/// The longest address a browser is handed; words are cut to fit.
const MAX_ADDRESS: usize = 7_500;

/// The issue as it would be opened.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Report {
    pub title: String,
    pub body: String,
}

/// What the issue says, from the person's words and the page, and the versions this program knows. `picture` names the file
/// saved for them to drag in, when there is one.
pub fn report(words: &str, page: &str, versions: &Versions, picture: Option<&str>) -> Result<Report, String> {
    let words = words.trim();
    if words.chars().count() > MAX_WORDS {
        return Err(format!("keep it under {MAX_WORDS} characters"));
    }
    let page = checks::one_line(page);
    if page.is_empty() || page.chars().count() > MAX_PAGE {
        return Err("that is not a page's name".to_owned());
    }
    let first: String = checks::one_line(words).chars().take(TITLE_WORDS).collect();
    let title = if first.is_empty() {
        format!("Something's off on {page}")
    } else {
        format!("Something's off on {page}: {first}")
    };
    let said = if words.is_empty() { "(no words given)" } else { words };
    let mut body = format!(
        "**What looks wrong**\n\n{said}\n\n**Where**\n\n- Page: {page}\n- D'thorga Companion {}\n- Tool kit {}\n- {}\n",
        versions.companion, versions.kit, versions.system
    );
    if let Some(name) = picture {
        body.push_str(&format!(
            "\n**The picture** is saved as `{name}` in your Pictures folder: drag it here before submitting.\n"
        ));
    }
    Ok(Report { title, body })
}

/// The versions a report names.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Versions {
    pub companion: String,
    pub kit: String,
    pub system: String,
}

/// Text made safe for an address: every byte but letters, digits and `-._~` percent-encoded.
pub fn encoded(text: &str) -> String {
    text.bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || b"-._~".contains(&b) {
                (b as char).to_string()
            } else {
                format!("%{b:02X}")
            }
        })
        .collect()
}

/// GitHub's new-issue page for the Companion, filled in; the body cut, at a character, to keep the address a browser takes.
pub fn address(report: &Report) -> String {
    let start = format!("{ISSUES}?title={}&body=", encoded(&report.title));
    let mut body = report.body.clone();
    while start.len() + encoded(&body).len() > MAX_ADDRESS && !body.is_empty() {
        let keep = body.chars().count().saturating_sub(200);
        body = body.chars().take(keep).collect();
        body.push_str("\n\n(cut to fit)");
    }
    format!("{start}{}", encoded(&body))
}

/// The person's home folder, which the window hides in the picture before it is taken.
pub fn home() -> Option<String> {
    std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")).ok().filter(|h| h.len() > 3)
}

/// Saves the picture for the person to drag into the issue, and opens the issue in their browser. Returns the picture's file name.
pub fn open(pictures_folder: &Path, report: &Report, picture: &[u8], picture_name: &str) -> Result<String, Failure> {
    let name = if picture.is_empty() {
        String::new()
    } else {
        pictures::check_png(picture).map_err(Failure::refused)?;
        let saved = pictures::save(pictures_folder, picture_name, picture)?;
        saved.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default()
    };
    process::open_address(&address(report))
        .map_err(|problem| Failure::refused(format!("The browser could not be asked to open GitHub: {problem}")))?;
    Ok(name)
}

#[cfg(test)]
#[path = "tests/report_page.rs"]
mod tests;
