use super::*;
use serde_json::json;

fn root() -> PathBuf {
    if cfg!(windows) { PathBuf::from("D:/work/repo") } else { PathBuf::from("/work/repo") }
}

fn kit() -> KitEffects {
    kit_effects(&json!({"data": {"commands": [
        {"name": "query-defs", "reports": [{"name": "show", "effect": "reads"}, {"name": "find", "effect": "reads"}]},
        {"name": "steam-publish", "reports": [{"name": "upload", "effect": "owner-press"}]},
        {"name": "cleanup", "reports": [{"name": null, "effect": "writes"}]},
        {"name": "workshop-research", "reports": [{"name": "report", "effect": "reads-online"}]},
    ]}}))
}

fn sorted(text: &str) -> Sorted {
    let root = root();
    sort(rules(), &kit(), text, &root, &root)
}

fn tier(text: &str) -> Tier {
    sorted(text).tier
}

#[test]
fn the_shipped_rules_can_be_read() {
    let rules = checked_rules(RULES).expect("config/chat-commands.json");
    assert!(rules.rules.len() > 30);
    assert!(rules.rules.iter().any(|r| r.kit), "the kit has its place in the order");
}

#[test]
fn a_rule_with_no_programs_kind_or_why_is_refused() {
    let bad =
        r#"{"environment": [], "shells": {}, "kit": {"programs": [], "module": "m"}, "rules": [{"programs": ["ls"]}]}"#;
    assert!(checked_rules(bad).unwrap_err().contains("rule 1"));
}

#[test]
fn reading_runs_by_itself() {
    for text in [
        "git status",
        "git log --oneline -5",
        "git diff HEAD~1 -- src/A.cs",
        "git -C sub show HEAD",
        "ls -la src",
        "rg -n Translate src",
        "cat README.md | head -20",
        "git log --oneline | grep fix",
        "git branch",
        "git stash list",
        "find . -name '*.cs'",
        "Get-ChildItem -Recurse src",
        "echo done",
    ] {
        let found = sorted(text);
        assert_eq!(found.tier, Tier::Runs, "{text}: {found:?}");
        assert_eq!(found.why, ["reads"], "{text}");
    }
}

#[test]
fn tests_and_the_gate_run_by_themselves() {
    for text in [
        "python scripts/check-all.py",
        "cd external/phobos-modkit/python && python -m phobos_modkit gate --root ..",
        "npm test",
        "npx vitest run src/lib/chat",
        "npx playwright test tests/accessibility/chat.spec.ts",
        "cargo test --locked",
        "cargo fmt --all -- --check",
        "dotnet test",
        "python -m unittest discover -s tests",
    ] {
        let found = sorted(text);
        assert_eq!(found.tier, Tier::Runs, "{text}: {found:?}");
        assert!(found.why.contains(&"tests".to_owned()), "{text}: {found:?}");
    }
}

#[test]
fn the_kits_reports_follow_what_its_manifest_says_they_do() {
    let reads = sorted("python -m phobos_modkit query-defs show --root . ThingDef/Boat");
    assert_eq!((reads.tier, reads.why.clone()), (Tier::Runs, vec!["kit-reads".to_owned()]));
    assert_eq!(sorted("PYTHONIOENCODING=utf-8 python -m phobos_modkit query-defs find --name Boat").tier, Tier::Runs);
    assert_eq!(
        sorted("python -m phobos_modkit cleanup --apply").why,
        ["kit-changes"],
        "a command's one unnamed report"
    );
    assert_eq!(sorted("python -m phobos_modkit workshop-research report x").why, ["goes-online"]);
    assert_eq!(sorted("python -m phobos_modkit a-tool-it-does-not-have list").why, ["unknown"]);
    let upload = sorted("python -m phobos_modkit steam-publish upload --item 1");
    assert_eq!((upload.tier, upload.why), (Tier::Refused, vec!["owner-only".to_owned()]));
}

#[test]
fn what_changes_something_asks_and_says_what() {
    for (text, why, warn) in [
        ("git commit -m \"Boats float\"", "changes-git", false),
        ("git push", "goes-online", false),
        ("git push origin --delete old", "deletes-online", true),
        ("git reset --hard HEAD", "throws-away-work", true),
        ("git checkout -- src/A.cs", "throws-away-work", true),
        ("rm -rf build", "deletes", true),
        ("Remove-Item -Recurse obj", "deletes", true),
        ("mkdir notes", "changes-files", false),
        ("npm install", "installs", true),
        ("pip install requests", "installs", true),
        ("npx some-package", "installs", true),
        ("cargo build --release", "builds", false),
        ("dotnet build", "builds", false),
        ("python scripts/deploy.py --apply", "runs-script", false),
        ("node tools/x.js", "runs-script", false),
        ("curl https://example.com", "goes-online", false),
        ("taskkill /IM RimWorldWin64.exe", "stops-program", true),
        ("frobnicate --all", "unknown", false),
        ("git branch new-feature", "changes-git", false),
        ("npx playwright install", "installs", true),
        ("sort -o out.txt in.txt", "unknown", false),
    ] {
        let found = sorted(text);
        assert_eq!(found.tier, Tier::Asks, "{text}: {found:?}");
        assert_eq!(found.why, [why], "{text}");
        assert_eq!(found.warn, warn, "{text}");
    }
}

#[test]
fn what_the_shared_rules_forbid_is_refused_even_with_a_yes() {
    for (text, why) in [
        ("git push --force origin main", "force-push"),
        ("git push -f", "force-push"),
        ("git push origin +main", "force-push"),
        ("git push --force-with-lease", "force-push"),
        ("git rebase -i HEAD~3", "rewrites-history"),
        ("git commit --amend --no-edit", "rewrites-history"),
        ("git commit --no-verify -m x", "skips-checks"),
        ("git commit -n -m x", "skips-checks"),
        ("git push --no-verify", "skips-checks"),
        ("git -c commit.gpgsign=false commit -m x", "skips-checks"),
        ("gh repo edit --visibility public", "visibility"),
        ("gh auth token", "credentials"),
        ("git credential fill", "credentials"),
        ("rm Saves/Colony.rws", "saves"),
        ("steamcmd +workshop_build_item x.vdf", "owner-only"),
        ("echo x > Saves/Colony.rws", "saves"),
    ] {
        let found = sorted(text);
        assert_eq!(found.tier, Tier::Refused, "{text}: {found:?}");
        assert_eq!(found.why, [why], "{text}");
    }
    // A dry run is not a force-push, and git push -n is a dry run.
    assert_eq!(tier("git push -n"), Tier::Asks);
}

#[test]
fn paths_outside_the_repository_ask_to_read_and_are_refused_to_change() {
    let outside = if cfg!(windows) { "C:/Users/someone/.ssh/id_rsa" } else { "/home/someone/.ssh/id_rsa" };
    assert_eq!(sorted(&format!("cat {outside}")).why, ["reads-outside"]);
    assert_eq!(sorted("cat ../other/notes.md").why, ["reads-outside"]);
    assert_eq!(sorted("cat $HOME/.ssh/id_rsa").why, ["reads-outside"], "a value not in the text");
    assert_eq!(sorted("ls ~").why, ["reads-outside"]);
    let deleting = sorted(&format!("rm -rf {}", if cfg!(windows) { "C:/Users/someone" } else { "/home/someone" }));
    assert_eq!((deleting.tier, deleting.why), (Tier::Refused, vec!["outside-repository".to_owned()]));
    assert_eq!(tier("rm ../../important.txt"), Tier::Refused);
    let unknown = sorted("rm -rf $BUILD");
    assert_eq!((unknown.tier, unknown.warn), (Tier::Asks, true));
    // Inside, a path is fine, however it is written.
    assert_eq!(tier("cat ./src/../README.md"), Tier::Runs);
    let inside = format!("{}/README.md", root().to_string_lossy());
    assert_eq!(tier(&format!("cat {inside}")), Tier::Runs);
}

#[test]
fn a_cd_moves_where_later_parts_are_judged_from() {
    assert_eq!(tier("cd src && cat A.cs"), Tier::Runs);
    assert_eq!(sorted("cd .. && cat other/notes.md").why, ["reads-outside"]);
    // The repository's own folder, named from above, is the repository: like rm -rf ., it asks, marked to look at twice.
    let whole = sorted("cd .. && rm -rf repo");
    assert_eq!((whole.tier, whole.warn), (Tier::Asks, true));
    assert_eq!(tier("cd .. && rm -rf other"), Tier::Refused, "a folder beside the repository is outside it");
    assert_eq!(sorted("cd $HOME && ls").why, ["reads-outside"]);
}

#[test]
fn a_shell_given_text_is_read_the_same_way() {
    assert_eq!(tier("bash -c \"git status && git log -3\""), Tier::Runs);
    assert_eq!(tier("bash -lc 'git push --force'"), Tier::Refused);
    assert_eq!(tier("pwsh -Command \"Get-ChildItem src\""), Tier::Runs);
    assert_eq!(tier("cmd /c dir src"), Tier::Runs);
    assert_eq!(sorted("bash -c 'rm -rf build'").why, ["deletes"]);
    assert_eq!(sorted("bash scripts/build.sh").why, ["runs-script"]);
    let deep = "bash -c \"bash -c 'bash -c \\\"bash -c ls\\\"'\"";
    assert_eq!(sorted(deep).why, ["unknown"], "only so many shells deep");
}

#[test]
fn hidden_commands_redirections_and_odd_text_ask() {
    assert_eq!(sorted("echo $(rm -rf build)").why, ["hidden-command", "deletes"]);
    assert_eq!(sorted("cat `which secret`").why[0], "hidden-command");
    assert_eq!(sorted("git log > log.txt").why, ["writes-output"]);
    assert_eq!(tier("git log 2>/dev/null"), Tier::Runs);
    assert_eq!(tier("git log 2>&1 | head"), Tier::Runs);
    assert_eq!(tier("Get-ChildItem 2>$null"), Tier::Runs);
    assert_eq!(sorted("git log >> ../log.txt").why, ["outside-repository"]);
    assert_eq!(sorted("echo 'unclosed").why, ["unknown"]);
    assert_eq!(sorted("SECRET=1 git status").why, ["sets-environment"]);
    assert_eq!(sorted(&"x".repeat(MAX_COMMAND + 1)).why, ["unknown"]);
    assert_eq!(sorted("").why, ["unknown"]);
    // Quoted operators are words, not operators.
    assert_eq!(tier("git log --grep 'a && rm -rf /'"), Tier::Runs);
    assert_eq!(tier("rg \"x | y\" src"), Tier::Runs);
}

#[test]
fn a_mixed_command_takes_its_strictest_part() {
    let mixed = sorted("git status && npm install && git push --force");
    assert_eq!((mixed.tier, mixed.why), (Tier::Refused, vec!["force-push".to_owned()]));
    let asks = sorted("git status; rm build/x.txt; git diff");
    assert_eq!((asks.tier, asks.why), (Tier::Asks, vec!["deletes".to_owned()]));
}

#[test]
fn the_mode_decides_what_runs() {
    let reads = sorted("git status");
    assert_eq!(decide(Mode::Automatic, &reads), Tier::Runs);
    assert_eq!(decide(Mode::Ask, &reads), Tier::Asks);
    let refused = sorted("git push --force");
    for mode in [Mode::Refused, Mode::Ask, Mode::Automatic] {
        assert_eq!(decide(mode, &refused), Tier::Refused);
    }
    assert_eq!(Mode::default(), Mode::Ask, "the owner's choice: it starts on Ask");
    assert!(!Mode::Refused.offers_terminal() && Mode::Ask.offers_terminal());
    assert_eq!(Mode::parse("automatic"), Some(Mode::Automatic));
    assert_eq!(Mode::parse("all"), None);
}

#[test]
fn a_command_is_shown_quoted_and_remembered_by_its_words() {
    assert_eq!(joined("git", &["commit".into(), "-m".into(), "Boats float".into()]), "git commit -m \"Boats float\"");
    assert_eq!(joined("echo", &["$HOME".into()]), "echo \"\\$HOME\"");
    let shown = joined("bash", &["-c".into(), "git status && git log".into()]);
    assert_eq!(tier(&shown), Tier::Runs, "a command joined for showing sorts as it would run");
    assert_eq!(remembered("  git   status "), "git status");
    assert!(told(&["force-push".into()]).contains("force-pushing"));
}

#[test]
fn every_reason_the_rules_give_has_words_in_the_window() {
    let window = include_str!("../../../../src/lib/chat/presentation.ts");
    let mut ids: Vec<String> = rules().rules.iter().filter_map(|r| r.why.clone()).collect();
    ids.extend(
        [
            "unknown",
            "hidden-command",
            "writes-output",
            "reads-outside",
            "sets-environment",
            "kit-reads",
            "kit-changes",
            "goes-online",
            "owner-only",
            "outside-repository",
            "saves",
        ]
        .map(str::to_owned),
    );
    for id in ids {
        assert!(window.contains(&format!("\"chat-why-{id}\"")), "no words for {id}");
    }
}
