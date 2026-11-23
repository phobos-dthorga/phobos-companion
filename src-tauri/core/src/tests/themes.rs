use super::*;

fn folder(name: &str) -> PathBuf {
    let path = std::env::temp_dir().join(format!("companion-themes-{name}-{}", std::process::id()));
    let _ = fs::remove_dir_all(&path);
    path
}

/// A theme of the owner's: House D'thorga's colours with its canvas a shade lighter, under its own id.
fn mine(id: &str) -> String {
    let mut theme = built_ins().remove(0);
    theme.id = id.to_owned();
    theme.name = "Mine".to_owned();
    theme.author = None;
    theme.colours.insert("canvas".to_owned(), "#100C12".to_owned());
    theme.to_file()
}

#[test]
fn the_programs_own_themes_all_pass_and_house_dthorga_is_first() {
    let themes = built_ins();
    assert_eq!(themes.len(), BUILT_INS.len(), "a built-in theme failed its checks");
    assert_eq!(themes[0].id, DEFAULT_ID);
    for theme in &themes {
        assert!(contrast_problems(theme).is_empty(), "{} has contrast problems", theme.name);
        assert!(theme.built_in());
    }
}

#[test]
fn contrast_is_wcags() {
    assert!((contrast("#000000", "#FFFFFF") - 21.0).abs() < 1e-9);
    assert!((contrast("#123456", "#ABCDEF") - contrast("#ABCDEF", "#123456")).abs() < 1e-12);
}

#[test]
fn a_theme_is_data_and_nothing_else() {
    let good = mine("my.theme");
    assert!(parse(&good, false).is_ok());
    let with = |from: &str, to: &str| parse(&good.replacen(from, to, 1), false).unwrap_err();
    assert!(with("\"name\"", "\"css\": \"body{}\", \"name\"").contains("cannot"));
    assert!(with("\"schema_version\": 1", "\"schema_version\": 2").contains("format 2"));
    assert!(with("\"my.theme\"", "\"My Theme\"").contains("not one a theme may have"));
    assert!(with("\"my.theme\"", "\"org.phobosdthorga.companion.mine\"").contains("only the program's own"));
    assert!(with("#100C12", "red").contains("#RRGGBB"));
    assert!(with("\"canvas\"", "\"background_image\"").contains("no place for"));
    assert!(parse(&"x".repeat(MAX_BYTES + 1), false).unwrap_err().contains("KB"));
}

#[test]
fn a_theme_that_cannot_be_read_says_which_colours() {
    let dim = mine("dim.theme").replace("\"text_muted\": \"#C9BEC8\"", "\"text_muted\": \"#3A3A3A\"");
    let why = usable(&dim, false).unwrap_err();
    assert!(why.contains("text_muted on canvas"), "{why}");
}

#[test]
fn mixing_is_css_color_mix_in_srgb() {
    assert_eq!(mix("#FF0000", "#000000", 0.2), "#330000");
    assert_eq!(mix("#FF8A7A", "#0E0B10", 0.2), "#3E2425");
    assert_eq!(mix("#123456", "#123456", 0.2), "#123456");
}

#[test]
fn words_must_read_on_removed_and_added_lines_and_the_shades_too() {
    // Muted words that read on every plain surface (4.55:1 on the softest) but not on a changed line's tinted background, nor on
    // the shades a page lays under chosen rows and badges (0.47.0).
    let muted = mine("muted.theme").replace("\"text_muted\": \"#C9BEC8\"", "\"text_muted\": \"#8C8C8C\"");
    let problems = contrast_problems(&parse(&muted, false).unwrap());
    assert!(problems.iter().all(|p| p.role == "text_muted"), "{problems:?}");
    let on: Vec<&str> = problems.iter().map(|p| p.on.as_str()).collect();
    assert_eq!(
        on,
        [
            "diff_removed",
            "diff_added",
            "shade_accent",
            "shade_observed",
            "shade_comparison",
            "shade_success",
            "shade_risk"
        ]
    );
}

#[test]
fn every_built_in_theme_reads_on_every_shade() {
    for theme in built_ins() {
        assert!(contrast_problems(&theme).is_empty(), "{}: {:?}", theme.name, contrast_problems(&theme));
    }
}

#[test]
fn choosing_keeping_and_removing_themes() {
    let folder = folder("keep");
    let start = status(&folder);
    assert_eq!(start.active.id, DEFAULT_ID);
    assert!(start.fell_back.is_none());

    let kept = keep(&folder, &mine("my.theme")).unwrap();
    assert_eq!(kept.active.id, "my.theme");
    assert!(kept.themes.iter().any(|o| o.theme.id == "my.theme" && !o.built_in));

    // The same colours under another id are a twin; the same id is a revision.
    assert!(keep(&folder, &mine("twin.theme")).unwrap_err().detail.contains("exactly the colours of Mine"));
    let revised = mine("my.theme").replace("\"Mine\"", "\"Mine, revised\"");
    assert_eq!(keep(&folder, &revised).unwrap().active.name, "Mine, revised");

    let chosen = choose(&folder, "org.phobosdthorga.companion.high-contrast").unwrap();
    assert_eq!(chosen.active.name, "High contrast");
    assert!(choose(&folder, "nowhere").is_err());

    choose(&folder, "my.theme").unwrap();
    let removed = remove(&folder, "my.theme").unwrap();
    assert_eq!(removed.active.id, DEFAULT_ID);
    assert!(remove(&folder, DEFAULT_ID).unwrap_err().detail.contains("cannot be removed"));
    fs::remove_dir_all(&folder).unwrap();
}

#[test]
fn a_broken_chosen_theme_falls_back_and_says_why() {
    let folder = folder("broken");
    keep(&folder, &mine("my.theme")).unwrap();
    fs::write(file_of(&folder, "my.theme"), "{ not a theme").unwrap();
    let found = status(&folder);
    assert_eq!(found.active.id, DEFAULT_ID);
    assert!(found.fell_back.as_deref().unwrap_or_default().contains("could not be used"));
    assert_eq!(found.unreadable.len(), 1);
    fs::remove_dir_all(&folder).unwrap();
}

#[test]
fn the_code_colours_are_the_windows_roles_in_its_order() {
    let table: Value = serde_json::from_str(include_str!("../../../../src/lib/code/scopeRoles.json")).unwrap();
    let roles: Vec<String> =
        table["roles"].as_array().unwrap().iter().map(|role| format!("code_{}", role.as_str().unwrap())).collect();
    assert_eq!(roles, CODE_ROLES);
    assert_eq!(CODE_FROM.map(|(role, _)| role), CODE_ROLES);
}

#[test]
fn a_theme_without_code_colours_takes_them_from_its_other_roles() {
    let mut text = mine("old.theme");
    for role in CODE_ROLES {
        let line = text.lines().find(|line| line.contains(&format!("\"{role}\""))).unwrap().to_owned();
        text = text.replace(&format!("{line}\n"), "");
    }
    let text = text.replace("\"series_8\": \"#E66767\",", "\"series_8\": \"#E66767\"");
    let theme = usable(&text, false).unwrap();
    assert_eq!(theme.colour("code_keyword"), theme.colour("comparison"));
    assert_eq!(theme.colour("code_string"), theme.colour("success"));
    assert_eq!(theme.colour("code_comment"), theme.colour("text_muted"));
    assert!(theme.to_file().contains("\"code_plain\""));
}

#[test]
fn a_theme_gives_all_twelve_code_colours_or_none() {
    let text = mine("some.theme").replace("    \"code_flow\": \"#C586C0\",\n", "");
    let why = parse(&text, false).unwrap_err();
    assert!(why.contains("11 of the twelve") && why.contains("code_flow"), "{why}");
}

#[test]
fn a_code_colour_must_read_on_the_background_and_on_changed_lines() {
    // Dark+'s own comment green reads on the background, but not on removed and added lines' tints (about 4.2:1 and 3.9:1).
    let dim = mine("dim-code.theme").replace("\"code_comment\": \"#78A964\"", "\"code_comment\": \"#6A9955\"");
    let problems = contrast_problems(&parse(&dim, false).unwrap());
    let found: Vec<String> = problems.iter().map(|p| format!("{}/{}", p.role, p.on)).collect();
    assert_eq!(found, ["code_comment/diff_removed", "code_comment/diff_added"], "{problems:?}");
}

#[test]
fn a_theme_file_writes_its_roles_in_order_and_reads_back_the_same() {
    let theme = built_ins().remove(1);
    let text = theme.to_file();
    assert!(text.find("\"canvas\"").unwrap() < text.find("\"series_8\"").unwrap());
    assert_eq!(parse(&text, true).unwrap(), theme);
}
