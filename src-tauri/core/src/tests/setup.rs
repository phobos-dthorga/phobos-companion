use super::*;
use serde_json::json;

/// What the kit's `programs status --json` gives as `data`, made up: git and ilspycmd missing, the SDK missing, a game's own program.
fn data() -> Value {
    json!({"system": "windows", "programs": [
        {"key": "git", "name": "git", "game": null, "neededBy": "History", "how": "not on the PATH", "here": false,
         "url": "https://git-scm.com/downloads", "everyday": true, "after": [], "fetchHere": true,
         "fetch": ["winget", "install", "--id", "Git.Git", "--exact"]},
        {"key": "dotnet-sdk", "name": ".NET 10 SDK", "game": null, "neededBy": "Memory", "how": "not on the PATH",
         "here": false, "url": "https://dotnet.microsoft.com/download", "everyday": false, "after": [], "fetchHere": true,
         "fetch": ["winget", "install", "--id", "Microsoft.DotNet.SDK.10"]},
        {"key": "ilspycmd", "name": "ilspycmd", "game": null, "neededBy": "Their code", "how": "not on the PATH",
         "here": false, "url": "https://github.com/icsharpcode/ILSpy", "everyday": false, "after": ["dotnet-sdk"],
         "fetchHere": false, "fetch": ["dotnet", "tool", "install", "--global", "ilspycmd"]},
        {"key": "xml-index", "name": "The kit's XML indexer", "game": null, "neededBy": "Saves", "how": "came with the installer",
         "here": true, "url": null, "everyday": false, "after": [], "fetchHere": false, "fetch": null},
        {"key": "todds", "name": "todds", "game": "rimworld", "neededBy": "Textures", "how": "not found", "here": false,
         "url": "https://github.com/RimSort/RimSort", "everyday": false, "after": [], "fetchHere": false, "fetch": null},
    ]})
}

fn with(mut data: Value, key: &str, field: &str, value: Value) -> Value {
    let programs = data["programs"].as_array_mut().expect("programs");
    let program = programs.iter_mut().find(|p| p["key"] == key).expect("the program");
    program[field] = value;
    data
}

#[test]
fn rows_say_how_each_program_stands_and_how_a_missing_one_is_fetched() {
    let rows = rows(&data(), &["rimworld".to_owned()], &["todds".to_owned()]);
    let row = |key: &str| rows.iter().find(|r| r.key == key).expect("the row").clone();
    assert_eq!(rows.len(), 5);
    let git = row("git");
    assert_eq!(git.state, State::Missing);
    assert!(git.everyday && git.page && git.fetcher_here);
    assert_eq!(git.command.as_deref(), Some("winget install --id Git.Git --exact"));
    assert_eq!(git.fetcher.as_deref(), Some("winget"));
    // ilspycmd waits for the SDK, by its name.
    assert_eq!(row("ilspycmd").waits_for, vec![".NET 10 SDK".to_owned()]);
    // The kit's own tool is here and has nothing to fetch it or a page to get it from.
    let indexer = row("xml-index");
    assert_eq!(indexer.state, State::Here);
    assert!(indexer.command.is_none() && !indexer.page);
    // Set aside is the person's word, and it is still not here.
    assert_eq!(row("todds").state, State::SetAside);
    assert_eq!(serde_json::to_value(State::SetAside).unwrap(), json!("set-aside"));
}

#[test]
fn each_row_carries_the_pages_that_use_it_from_the_companion_s_own_file() {
    let pages = checked_pages(PAGES).expect("config/setup-pages.json");
    assert!(pages.contains_key("dotnet-sdk") && !pages.contains_key("git"));
    let rows = rows(&data(), &["rimworld".to_owned()], &[]);
    let row = |key: &str| rows.iter().find(|r| r.key == key).expect("the row").clone();
    assert_eq!(row("dotnet-sdk").pages, vec!["memory".to_owned(), "performance".to_owned()]);
    assert_eq!(row("todds").pages, vec!["mods".to_owned()]);
    // git says so on every page already.
    assert!(row("git").pages.is_empty());
    assert!(checked_pages(r#"{"pages": {"x": []}}"#).is_err());
    assert!(checked_pages(r#"{"pages": {"x": [""]}}"#).is_err());
    assert!(checked_pages("not json").is_err());
}

#[test]
fn a_game_s_own_program_shows_only_for_a_game_on_the_list() {
    assert!(rows(&data(), &[], &[]).iter().all(|r| r.key != "todds"));
    assert!(rows(&data(), &["another".to_owned()], &[]).iter().all(|r| r.key != "todds"));
    assert!(rows(&data(), &["rimworld".to_owned()], &[]).iter().any(|r| r.key == "todds"));
}

#[test]
fn only_the_kit_s_own_command_for_a_missing_program_may_run() {
    assert_eq!(command_of(&data(), "git").unwrap()[..2], ["winget".to_owned(), "install".to_owned()]);
    // Not a program the kit names, one already here, and one nothing fetches.
    assert!(command_of(&data(), "nothing").unwrap_err().contains("no program"));
    assert!(command_of(&with(data(), "git", "here", json!(true)), "git").unwrap_err().contains("already"));
    assert!(command_of(&data(), "todds").unwrap_err().contains("no command"));
    // Never anything but winget or dotnet, whatever the kit's answer says.
    let other = with(data(), "git", "fetch", json!(["powershell", "-c", "anything"]));
    assert!(command_of(&other, "git").unwrap_err().contains("not a program a fetch may start"));
    // Words stay plain: no line breaks, nothing empty, nothing endless.
    let broken = with(data(), "git", "fetch", json!(["winget", "install\nmore"]));
    assert!(command_of(&broken, "git").unwrap_err().contains("plain words"));
    let empty = with(data(), "git", "fetch", json!(["winget", ""]));
    assert!(command_of(&empty, "git").is_err());
    let long = with(data(), "git", "fetch", json!(vec!["winget"; 17]));
    assert!(command_of(&long, "git").is_err());
}

#[test]
fn pkexec_may_only_start_a_package_manager() {
    let apt = with(data(), "git", "fetch", json!(["pkexec", "apt-get", "install", "-y", "git"]));
    assert_eq!(command_of(&apt, "git").unwrap()[1], "apt-get");
    for bad in [json!(["pkexec", "sh", "-c", "anything"]), json!(["pkexec", "apt-get"]), json!(["pkexec"])] {
        assert!(command_of(&with(data(), "git", "fetch", bad.clone()), "git").is_err(), "{bad}");
    }
}

#[test]
fn a_program_that_needs_another_first_waits_for_it() {
    assert!(command_of(&data(), "ilspycmd").unwrap_err().contains("needs .NET 10 SDK first"));
    let ready = with(data(), "dotnet-sdk", "here", json!(true));
    assert_eq!(command_of(&ready, "ilspycmd").unwrap()[0], "dotnet");
}

#[test]
fn a_page_is_opened_only_at_an_https_address_the_kit_names() {
    assert_eq!(address_of(&data(), "git").unwrap(), "https://git-scm.com/downloads");
    assert!(address_of(&data(), "xml-index").is_err());
    assert!(address_of(&data(), "nothing").is_err());
    for bad in ["http://git-scm.com", "file:///C:/x", "https://", "https://a b", "steam://run/1", "https://a\nb"] {
        assert!(address_of(&with(data(), "git", "url", json!(bad)), "git").is_err(), "{bad}");
    }
}

#[test]
fn output_keeps_a_progress_bar_s_last_drawing_and_drops_codes_and_spinners() {
    let output = "Found Git [Git.Git]\r\n   -\r   \\\r   |\r\n\u{1b}[32mDownloading\u{1b}[0m https://example\r\n  ██▒▒  10%\r  ████  100%\r\nDone\r\nDone\r\n";
    assert_eq!(tidy(output), "Found Git [Git.Git]\nDownloading https://example\n  ████  100%\nDone");
    assert_eq!(tidy(""), "");
    let long = "é".repeat(SHOWN + 50);
    assert_eq!(tidy(&long).chars().count(), SHOWN);
}

#[test]
fn the_registry_s_answer_is_read_and_its_names_expanded() {
    let output = "\r\nHKEY_CURRENT_USER\\Environment\r\n    Path    REG_EXPAND_SZ    %USERPROFILE%\\.dotnet\\tools;C:\\Tools\r\n\r\n";
    let value = reg_value(output).unwrap();
    assert_eq!(value, "%USERPROFILE%\\.dotnet\\tools;C:\\Tools");
    assert_eq!(reg_value("    Path    REG_SZ    C:\\One").unwrap(), "C:\\One");
    assert!(reg_value("ERROR: The system was unable to find the specified registry key or value.").is_none());
    let lookup = |name: &str| (name == "USERPROFILE").then(|| "C:\\Users\\someone".to_owned());
    assert_eq!(expand(&value, lookup), "C:\\Users\\someone\\.dotnet\\tools;C:\\Tools");
    assert_eq!(expand("50% of %NOTHING% and %", lookup), "50% of %NOTHING% and %");
}

#[test]
fn the_fresh_path_is_windows_own_then_what_this_program_adds_each_folder_once() {
    let fresh = fresh_path(
        Some("C:\\Windows;C:\\Program Files\\Git\\cmd"),
        Some("C:\\Me\\bin\\"),
        "c:\\windows\\;C:\\Extra;C:\\Me\\bin;;",
    );
    assert_eq!(fresh, "C:\\Windows;C:\\Program Files\\Git\\cmd;C:\\Me\\bin\\;C:\\Extra");
    // With nothing read from the registry, the path stays as it was.
    assert_eq!(fresh_path(None, None, "C:\\One;C:\\Two"), "C:\\One;C:\\Two");
}
