//! The tool kit's arguments, built so that text the window sent is never read as an option.
//!
//! `given` always writes `--option=value` as one argument, for any text from the window. `pair` writes a value the host chose or
//! has checked as two arguments, and still as one if it opens with a dash, so no value can turn into an option by accident.

use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Args(Vec<String>);

impl Args {
    /// A tool and, for most, the report to run.
    pub fn new(tool: &str, report: &str) -> Self {
        Self(vec![tool.to_owned(), report.to_owned()])
    }

    /// The repository to run on.
    pub fn root(self, path: &Path) -> Self {
        self.pair("--root", &path.display().to_string())
    }

    /// Every repository, each with its own `--root`.
    pub fn roots<'a>(mut self, paths: impl IntoIterator<Item = &'a Path>) -> Self {
        for path in paths {
            self = self.root(path);
        }
        self
    }

    /// A file or folder the host chose.
    pub fn path(self, option: &str, path: &Path) -> Self {
        self.pair(option, &path.display().to_string())
    }

    /// A value the host chose or checked: two arguments, or one when it opens with a dash.
    pub fn pair(mut self, option: &str, value: &str) -> Self {
        if value.starts_with('-') {
            self.0.push(format!("{option}={value}"));
        } else {
            self.0.extend([option.to_owned(), value.to_owned()]);
        }
        self
    }

    /// Text from the window: always one argument, `--option=value`.
    pub fn given(mut self, option: &str, value: &str) -> Self {
        self.0.push(format!("{option}={value}"));
        self
    }

    /// An option that takes no value.
    pub fn flag(mut self, option: &str) -> Self {
        self.0.push(option.to_owned());
        self
    }

    /// Several arguments the host built itself, such as a list of checked names.
    pub fn extend(mut self, more: impl IntoIterator<Item = String>) -> Self {
        self.0.extend(more);
        self
    }

    /// The finished arguments, asking for the kit's JSON envelope.
    pub fn json(self) -> Vec<String> {
        self.flag("--json").0
    }

    /// The finished arguments as they are.
    pub fn done(self) -> Vec<String> {
        self.0
    }
}

#[cfg(test)]
#[path = "tests/args.rs"]
mod tests;
