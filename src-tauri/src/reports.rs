//! Which of the kit's reports the window may offer for a game, and running them. The rule lives here, not in the window:
//! a report runs only if the manifest says it only reads, has a plain question, and needs nothing typed.

use crate::failure::{Failure, FailureCode};
use crate::kit;
use serde::Serialize;
use serde_json::Value;

const READS: &str = "reads";
const TOP_OPTION: &str = "--top";
const JSON_OPTION: &str = "--json";
const JSON_TO_STANDARD_OUTPUT: &str = "-";
const FLAG_KIND: &str = "flag";
const MAX_TOP: u32 = 5000;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ReportEntry {
    pub command: String,
    pub report: Option<String>,
    pub question: String,
    /// What the report mostly is when the window should give it a page of its own, such as `globe`.
    pub surface: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ReportResult {
    pub report: Value,
    pub command_line: String,
}

/// The reports on offer for one game.
pub fn catalogue(game: &str) -> Result<Vec<ReportEntry>, Failure> {
    Ok(entries(&kit::read_manifest()?, game))
}

/// Runs one report, after checking again that it is one the window may run.
pub fn run(game: &str, command: &str, report: Option<&str>, top: u32) -> Result<ReportResult, Failure> {
    let manifest = kit::read_manifest()?;
    let options = find_runnable(&manifest, game, command, report)?;
    let arguments = arguments(command, report, options, top);
    let answer = kit::run(command, &arguments)?;
    Ok(ReportResult { report: answer["report"].clone(), command_line: command_line(command, report, options, top) })
}

fn commands_of(manifest: &Value) -> &[Value] {
    manifest["data"]["commands"].as_array().map_or(&[], Vec::as_slice)
}

fn reports_of(command: &Value) -> &[Value] {
    command["reports"].as_array().map_or(&[], Vec::as_slice)
}

fn options_of(report: &Value) -> &[Value] {
    report["options"].as_array().map_or(&[], Vec::as_slice)
}

fn runnable(report: &Value) -> bool {
    report["effect"].as_str() == Some(READS)
        && report["question"].is_string()
        && !options_of(report).iter().any(|option| option["required"].as_bool().unwrap_or(true))
}

fn entries(manifest: &Value, game: &str) -> Vec<ReportEntry> {
    commands_of(manifest)
        .iter()
        .filter(|command| command["game"].as_str() == Some(game))
        .flat_map(|command| {
            reports_of(command).iter().filter(|report| runnable(report)).map(|report| ReportEntry {
                command: command["name"].as_str().unwrap_or_default().to_owned(),
                report: report["name"].as_str().map(str::to_owned),
                question: report["question"].as_str().unwrap_or_default().to_owned(),
                surface: report["surface"].as_str().map(str::to_owned),
            })
        })
        .collect()
}

fn find_runnable<'a>(
    manifest: &'a Value,
    game: &str,
    command: &str,
    report: Option<&str>,
) -> Result<&'a [Value], Failure> {
    let refused = || Failure::new(FailureCode::Refused, format!("{command} {}", report.unwrap_or_default()));
    let entry = commands_of(manifest)
        .iter()
        .find(|c| c["name"].as_str() == Some(command) && c["game"].as_str() == Some(game))
        .ok_or_else(refused)?;
    let found = reports_of(entry).iter().find(|r| r["name"].as_str() == report).ok_or_else(refused)?;
    if runnable(found) { Ok(options_of(found)) } else { Err(refused()) }
}

fn option<'a>(options: &'a [Value], name: &str) -> Option<&'a Value> {
    options.iter().find(|option| option["name"].as_str() == Some(name))
}

fn base(command: &str, report: Option<&str>) -> Vec<String> {
    let mut arguments = vec![command.to_owned()];
    arguments.extend(report.map(str::to_owned));
    arguments
}

fn arguments(command: &str, report: Option<&str>, options: &[Value], top: u32) -> Vec<String> {
    let mut arguments = base(command, report);
    arguments.push(JSON_OPTION.to_owned());
    if option(options, JSON_OPTION).is_some_and(|json| json["kind"].as_str() != Some(FLAG_KIND)) {
        arguments.push(JSON_TO_STANDARD_OUTPUT.to_owned());
    }
    arguments.extend(top_arguments(options, top));
    arguments
}

fn top_arguments(options: &[Value], top: u32) -> Vec<String> {
    if option(options, TOP_OPTION).is_some() {
        vec![TOP_OPTION.to_owned(), top.clamp(1, MAX_TOP).to_string()]
    } else {
        Vec::new()
    }
}

/// The same report as a person would run it, for pasting into a console or a session.
fn command_line(command: &str, report: Option<&str>, options: &[Value], top: u32) -> String {
    let mut words = vec!["python".to_owned(), "-m".to_owned(), "phobos_modkit".to_owned()];
    words.extend(base(command, report));
    words.extend(top_arguments(options, top));
    words.join(" ")
}

#[cfg(test)]
#[path = "tests/reports.rs"]
mod tests;
