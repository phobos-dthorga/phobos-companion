//! The tool kit's reports as tools for the model (0.73.0; `docs/ai.md`, slice 3b; the owner, 23 Nov 2026: "go ahead with the kit's
//! tools for the model"). The same three tools the kit's MCP server offers AI programs (`find_reports`, `describe_report`,
//! `ask_report`), from phobos-modkit 1.110.0's `mcp tools`, and each call the model makes answered by `mcp call`, one process each:
//! **only reports the manifest calls `reads`, repositories by name from the games list, no paths, every answer redacted**, all
//! checked by the kit. This module only hands the model's call over whole and reads the answer back.

use companion_core::ai_client::{Tool, ToolCall};
use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::kit;
use serde_json::Value;

const TOOL: &str = "mcp";
const NAMES: [&str; 3] = ["find_reports", "describe_report", "ask_report"];
/// The most characters of a model's arguments handed to the kit, as `mcp call` takes them.
const MAX_ARGUMENTS: usize = 8_000;

/// The three tools as the kit describes them, with the games list's repositories in `ask_report`.
pub fn definitions() -> Result<Vec<Tool>, Failure> {
    let answer = kit::run(TOOL, &Args::new(TOOL, "tools").json())?;
    Ok(tools_of(&answer["data"]))
}

/// The tools in a `mcp tools` answer; any but the three are left out.
pub fn tools_of(data: &Value) -> Vec<Tool> {
    data["tools"]
        .as_array()
        .map_or(&[][..], Vec::as_slice)
        .iter()
        .filter(|t| t["name"].as_str().is_some_and(|n| NAMES.contains(&n)))
        .map(|t| Tool {
            name: t["name"].as_str().unwrap_or_default().to_owned(),
            description: t["description"].as_str().unwrap_or_default().to_owned(),
            schema: t["inputSchema"].clone(),
        })
        .collect()
}

/// The kit's arguments for one call: a tool of the three, and the model's arguments as one JSON object of a sane length.
pub fn call_arguments(call: &ToolCall) -> Result<Vec<String>, String> {
    if !NAMES.contains(&call.name.as_str()) {
        return Err(format!("there is no tool {:?}", call.name));
    }
    if !call.input.is_object() {
        return Err("the tool's arguments must be one JSON object".to_owned());
    }
    let arguments = call.input.to_string();
    if arguments.len() > MAX_ARGUMENTS {
        return Err(format!("the arguments are longer than {MAX_ARGUMENTS} characters"));
    }
    Ok(Args::new(TOOL, "call").given("--tool", &call.name).given("--arguments", &arguments).json())
}

/// One call answered by the kit: its text, and whether it was refused or failed. Never an error: a model is told in words.
pub fn call(call: &ToolCall) -> (String, bool) {
    let arguments = match call_arguments(call) {
        Ok(arguments) => arguments,
        Err(problem) => return (problem, true),
    };
    match kit::run(TOOL, &arguments) {
        Ok(answer) => (
            answer["data"]["text"].as_str().unwrap_or("the tool kit gave no answer").to_owned(),
            answer["data"]["isError"].as_bool().unwrap_or(true),
        ),
        Err(failure) => (format!("the tool kit could not be asked: {}", failure.detail), true),
    }
}

/// A call in a few words, for the person: which tool, and what it asked.
pub fn summary(call: &ToolCall) -> String {
    let field = |name: &str| call.input[name].as_str().unwrap_or_default().to_owned();
    match call.name.as_str() {
        "find_reports" => {
            let words = field("words");
            let game = field("game");
            let mut found =
                if words.is_empty() { "Find reports".to_owned() } else { format!("Find reports about \"{words}\"") };
            if !game.is_empty() {
                found.push_str(&format!(" for {game}"));
            }
            found
        }
        "describe_report" => format!("Describe {} {}", field("command"), field("report")).trim_end().to_owned(),
        "ask_report" => {
            let mut found = format!("Ask {} {}", field("command"), field("report")).trim_end().to_owned();
            let repository = field("repository");
            if !repository.is_empty() {
                found.push_str(&format!(" about {repository}"));
            }
            if let Some(arguments) = call.input["arguments"].as_object().filter(|a| !a.is_empty()) {
                found.push_str(&format!(", with {}", Value::Object(arguments.clone())));
            }
            found
        }
        other => format!("Ask for {other}"),
    }
}

#[cfg(test)]
#[path = "tests/ai_tools.rs"]
mod tests;
