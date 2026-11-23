use super::*;
use std::collections::BTreeMap;

fn folder(name: &str) -> PathBuf {
    let path = std::env::temp_dir().join(format!("companion-code-colours-{name}-{}", std::process::id()));
    let _ = fs::remove_dir_all(&path);
    path
}

fn house() -> Theme {
    themes::built_ins().remove(0)
}

/// Three files shaped as VS Code's own Dark Modern, Dark+ and Visual Studio Dark, written by hand: each builds on the next.
fn files() -> BTreeMap<&'static str, &'static str> {
    BTreeMap::from([
        (
            "modern.json",
            r##"{
              // Comments and trailing commas, as VS Code allows them.
              "name": "Modern, by hand",
              "include": "./plus.json",
              "type": "dark",
              "colors": { "editor.foreground": "#CCCCCC", },
            }"##,
        ),
        (
            "plus.json",
            r##"{
              "include": "./vs.json",
              "tokenColors": [
                { "scope": ["entity.name.function", "support.function"], "settings": { "foreground": "#DCDCAA" } },
                { "scope": "keyword.control", "settings": { "foreground": "#C586C0" } },
              ],
              "semanticTokenColors": { "newOperator": "#C586C0" }
            }"##,
        ),
        (
            "vs.json",
            r##"{
              "tokenColors": [
                { "settings": { "foreground": "#D4D4D4" } },
                { "scope": "comment", "settings": { "foreground": "#6A9955" } },
                { "scope": "keyword, storage.type", "settings": { "foreground": "#569CD6" } },
                { "scope": "markup.bold", "settings": { "fontStyle": "bold italic sparkly" } },
                { "scope": "string", "settings": { "foreground": "#CE917880" } },
                { "scope": "constant.numeric", "settings": { "foreground": "not a colour" } },
                { "scope": "entity.name.tag" }
              ]
            }"##,
        ),
    ])
}

fn reader(files: BTreeMap<&'static str, &'static str>) -> impl FnMut(&str) -> Result<String, String> {
    move |name: &str| files.get(name).map(|text| (*text).to_owned()).ok_or_else(|| format!("{name}: not found"))
}

#[test]
fn comments_and_trailing_commas_are_taken_out_but_never_inside_strings() {
    let text = "{ \"a\": \"// not a comment, \\\"/* nor this */\\\"\", /* gone */ \"b\": [1, 2,], // gone\n }";
    let value: Value = serde_json::from_str(&strip_jsonc(text)).unwrap();
    assert_eq!(value["a"], "// not a comment, \"/* nor this */\"");
    assert_eq!(value["b"], serde_json::json!([1, 2]));
}

#[test]
fn colours_are_read_as_vs_code_reads_them_and_drawn_solid() {
    assert_eq!(colour("#abc"), Some(("#AABBCC".into(), false)));
    assert_eq!(colour("#abcd"), Some(("#AABBCC".into(), true)));
    assert_eq!(colour("#569cd6"), Some(("#569CD6".into(), false)));
    assert_eq!(colour("#569CD680"), Some(("#569CD6".into(), true)));
    assert_eq!(colour("blue"), None);
    assert_eq!(colour("#12345"), None);
}

#[test]
fn a_theme_is_read_with_the_files_it_builds_on_beneath_it() {
    let set = from_vscode("modern.json", None, &mut reader(files())).unwrap();
    assert_eq!(set.name, "Modern, by hand");
    assert_eq!(set.id, "modern-by-hand");
    assert_eq!(set.kind.as_deref(), Some("dark"));
    // The top file's editor colour wins over the scopeless rule beneath it.
    assert_eq!(set.plain.as_deref(), Some("#CCCCCC"));
    // The deepest file's rules come first, so the files built on top win, as in VS Code.
    let first: Vec<&str> = set.rules.iter().map(|r| r.scope[0].as_str()).collect();
    assert_eq!(first, ["comment", "keyword", "markup.bold", "string", "entity.name.function", "keyword.control"]);
    assert_eq!(set.rules[1].scope, ["keyword", "storage.type"]);
    assert_eq!(set.rules[2].font_style.as_deref(), Some("bold italic"));
    assert_eq!(set.rules[3].foreground.as_deref(), Some("#CE9178"));
    let notes = set.notes.join(" ");
    assert!(notes.contains("builds on plus.json and vs.json"), "{notes}");
    assert!(notes.contains("2 of its rules were left out"), "{notes}");
    assert!(notes.contains("1 of its colours are partly see-through"), "{notes}");
    assert!(notes.contains("semantic colours are not used"), "{notes}");
}

#[test]
fn a_label_from_the_list_names_the_set() {
    let set = from_vscode("modern.json", Some("Dark Modern"), &mut reader(files())).unwrap();
    assert_eq!((set.name.as_str(), set.id.as_str()), ("Dark Modern", "dark-modern"));
}

#[test]
fn a_theme_builds_only_on_files_in_its_own_folder_and_never_in_a_loop() {
    for outside in ["../plus.json", "sub/plus.json", "C:\\themes\\plus.json", "plus.tmTheme", ".hidden.json"] {
        let mut given = files();
        let text = format!("{{ \"include\": {outside:?} }}");
        given.insert("modern.json", Box::leak(text.into_boxed_str()));
        let why = from_vscode("modern.json", None, &mut reader(given)).unwrap_err();
        assert!(why.contains("not a theme file in its own folder"), "{outside}: {why}");
    }
    let mut looped = files();
    looped.insert("vs.json", r#"{ "include": "./modern.json" }"#);
    assert!(from_vscode("modern.json", None, &mut reader(looped)).unwrap_err().contains("builds on itself"));
    let mut deep = BTreeMap::new();
    for (name, next) in [("a.json", "b.json"), ("b.json", "c.json"), ("c.json", "d.json"), ("d.json", "e.json")] {
        deep.insert(name, &*Box::leak(format!("{{ \"include\": \"{next}\" }}").into_boxed_str()));
    }
    assert!(from_vscode("a.json", None, &mut reader(deep)).unwrap_err().contains("more than 3 other files"));
}

#[test]
fn a_theme_with_no_code_colours_or_too_large_says_why() {
    let none = BTreeMap::from([("ui.json", r##"{ "colors": { "editor.background": "#000000" } }"##)]);
    assert!(from_vscode("ui.json", None, &mut reader(none)).unwrap_err().contains("gives no colours for code"));
    let elsewhere = BTreeMap::from([("tm.json", r#"{ "tokenColors": "./theme.tmTheme" }"#)]);
    assert!(
        from_vscode("tm.json", None, &mut reader(elsewhere))
            .unwrap_err()
            .contains("keeps its code colours in another file")
    );
    let large = "x".repeat(MAX_BYTES + 1);
    let large = BTreeMap::from([("big.json", &*Box::leak(large.into_boxed_str()))]);
    assert!(from_vscode("big.json", None, &mut reader(large)).unwrap_err().contains("larger than 512 KB"));
}

#[test]
fn a_rule_stands_for_the_kind_of_code_its_selectors_name() {
    let role = |scopes: &[&str]| role_of(&scopes.iter().map(|s| (*s).to_owned()).collect::<Vec<_>>());
    assert_eq!(role(&["comment.line.double-slash"]), "comment");
    assert_eq!(role(&["keyword.control.flow"]), "flow");
    assert_eq!(role(&["keyword"]), "keyword");
    assert_eq!(role(&["entity.name.function.member"]), "function");
    assert_eq!(role(&["source.cs storage.type.cs"]), "type");
    assert_eq!(role(&["something.unheard.of"]), "plain");
}

#[test]
fn a_colour_that_cannot_be_read_on_the_theme_takes_the_themes_own_for_that_kind_of_code() {
    let set = from_vscode("modern.json", None, &mut reader(files())).unwrap();
    let active = resolve(&set, &house());
    // Dark+'s comment green and keyword blue fall below 4.5:1 on House D'thorga's removed lines; the rest read.
    assert_eq!(active.replaced, 2, "{:?}", active.rules);
    assert_eq!(active.rules[0].foreground.as_deref(), Some(house().colour("code_comment")));
    assert_eq!(active.rules[1].foreground.as_deref(), Some(house().colour("code_keyword")));
    assert_eq!(active.rules[4].foreground.as_deref(), Some("#DCDCAA"));
    assert_eq!(active.plain, "#CCCCCC");
    // A light theme's dark words cannot be read on a dark background at all: its plain colour is the theme's.
    let mut light = set.clone();
    light.plain = Some("#1F1F1F".into());
    assert_eq!(resolve(&light, &house()).plain, house().colour("code_plain"));
}

#[test]
fn keeping_choosing_and_removing_code_colours() {
    let folder = folder("keep");
    let theme = house();
    let start = status(&folder, &theme);
    assert_eq!((start.chosen.as_str(), start.active.is_none()), (THEME_OWN, true));

    let set = from_vscode("modern.json", Some("Dark Modern"), &mut reader(files())).unwrap();
    let kept = keep(&folder, &set, &theme).unwrap();
    assert_eq!(kept.chosen, "dark-modern");
    assert_eq!(kept.active.as_ref().unwrap().name, "Dark Modern");
    assert_eq!(kept.sets[0].rules, 6);

    assert!(choose(&folder, THEME_OWN, &theme).unwrap().active.is_none());
    assert!(choose(&folder, "nowhere", &theme).is_err());
    choose(&folder, "dark-modern", &theme).unwrap();
    let removed = remove(&folder, "dark-modern", &theme).unwrap();
    assert_eq!((removed.chosen.as_str(), removed.sets.len()), (THEME_OWN, 0));
    assert!(remove(&folder, THEME_OWN, &theme).is_err());
    fs::remove_dir_all(&folder).unwrap();
}

#[test]
fn a_kept_file_changed_by_hand_is_shown_and_never_used() {
    let folder = folder("changed");
    let theme = house();
    let set = from_vscode("modern.json", Some("Dark Modern"), &mut reader(files())).unwrap();
    keep(&folder, &set, &theme).unwrap();
    let path = file_of(&folder, "dark-modern");
    let text = fs::read_to_string(&path).unwrap().replace("#DCDCAA", "url(evil)");
    fs::write(&path, text).unwrap();
    let found = status(&folder, &theme);
    assert!(found.active.is_none());
    assert!(found.fell_back.as_deref().unwrap_or_default().contains("could not be used"));
    assert_eq!(found.unreadable.len(), 1);
    fs::remove_dir_all(&folder).unwrap();
}

#[test]
fn installed_themes_are_found_with_vs_codes_own_labels_and_only_inside_their_extension() {
    let root = folder("installed");
    let ext = root.join("theme-defaults");
    fs::create_dir_all(ext.join("themes")).unwrap();
    fs::write(
        ext.join("package.json"),
        r#"{ "name": "theme-defaults", "displayName": "%displayName%", "contributes": { "themes": [
            { "label": "%darkModern%", "uiTheme": "vs-dark", "path": "./themes/dark_modern.json" },
            { "label": "Light", "uiTheme": "vs", "path": "./themes/light.json" },
            { "label": "Sneaky", "uiTheme": "vs-dark", "path": "../../outside.json" },
            { "label": "Old", "uiTheme": "vs-dark", "path": "./themes/old.tmTheme" },
            { "label": "Missing", "uiTheme": "vs-dark", "path": "./themes/missing.json" }
        ] } }"#,
    )
    .unwrap();
    fs::write(ext.join("package.nls.json"), r#"{ "displayName": "Default Themes", "darkModern": "Dark Modern" }"#)
        .unwrap();
    for name in ["dark_modern.json", "light.json", "old.tmTheme"] {
        fs::write(ext.join("themes").join(name), "{}").unwrap();
    }
    fs::write(root.join("outside.json"), "{}").unwrap();
    let found = installed(&[root.clone(), root.join("not-there")]);
    let shown: Vec<(&str, &str, &str)> =
        found.iter().map(|i| (i.label.as_str(), i.extension.as_str(), i.kind.as_str())).collect();
    assert_eq!(shown, [("Dark Modern", "Default Themes", "dark"), ("Light", "Default Themes", "light")]);
    fs::remove_dir_all(&root).unwrap();
}

/// Reads VS Code's own themes on this computer, when the folder holding them is named in `COMPANION_VSCODE_THEMES`: a check run
/// by hand (`cargo test -p companion-core vs_codes_own -- --ignored`), since no test may depend on what is installed.
#[test]
#[ignore]
fn vs_codes_own_themes_on_this_computer_are_read() {
    let folder = PathBuf::from(std::env::var("COMPANION_VSCODE_THEMES").expect("COMPANION_VSCODE_THEMES"));
    for name in ["dark_modern.json", "2026-dark.json", "dark_plus.json", "hc_black.json", "light_modern.json"] {
        let path = folder.join(name);
        if !path.exists() {
            continue;
        }
        let set = read_file(&path, None).unwrap();
        let active = resolve(&set, &house());
        println!(
            "{name}: {} rules, plain {:?}, {} of them replaced on House D'thorga; {}",
            set.rules.len(),
            set.plain,
            active.replaced,
            set.notes.join(" ")
        );
    }
}
