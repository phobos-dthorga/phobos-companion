//! Why something could not be read. The window turns the code into words.

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FailureCode {
    PythonMissing,
    KitMissing,
    ToolFailed,
    Unreadable,
    ListUnreadable,
    Refused,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Failure {
    pub code: FailureCode,
    pub detail: String,
}

impl Failure {
    pub fn new(code: FailureCode, detail: impl Into<String>) -> Self {
        Self { code, detail: detail.into() }
    }
}
