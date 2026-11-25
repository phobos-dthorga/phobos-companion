use super::*;

fn versions() -> Versions {
    Versions { companion: "0.100.0".to_owned(), kit: "1.128.0".to_owned(), system: "Windows 11 Pro".to_owned() }
}

#[test]
fn a_report_says_the_words_the_page_and_the_versions_and_nothing_else() {
    let made =
        report("  The bar is drawn twice\nunder the tabs ", "Settings", &versions(), Some("Report 1.png")).unwrap();
    assert_eq!(made.title, "Something's off on Settings: The bar is drawn twice under the tabs");
    assert!(made.body.contains("The bar is drawn twice\nunder the tabs"));
    assert!(made.body.contains("- Page: Settings"));
    assert!(made.body.contains("D'thorga Companion 0.100.0"));
    assert!(made.body.contains("Tool kit 1.128.0"));
    assert!(made.body.contains("Windows 11 Pro"));
    assert!(made.body.contains("`Report 1.png`"));
    let quiet = report("", "Home", &versions(), None).unwrap();
    assert_eq!(quiet.title, "Something's off on Home");
    assert!(quiet.body.contains("(no words given)") && !quiet.body.contains("picture"));
    assert!(report("x", "", &versions(), None).is_err());
    assert!(report(&"x".repeat(MAX_WORDS + 1), "Home", &versions(), None).is_err());
}

#[test]
fn the_address_is_github_s_own_new_issue_page_filled_in_and_short_enough() {
    let made = report("a & b = c?", "Mods", &versions(), None).unwrap();
    let opened = address(&made);
    assert!(
        opened.starts_with("https://github.com/phobos-dthorga/phobos-companion/issues/new?title=Something%27s%20off")
    );
    assert!(opened.contains("a%20%26%20b%20%3D%20c%3F"));
    assert!(!opened.contains(' ') && !opened.contains('\n'));
    let long = report(&"é".repeat(MAX_WORDS), "Mods", &versions(), None).unwrap();
    assert!(address(&long).len() <= MAX_ADDRESS + 100);
    assert!(address(&long).contains(&encoded("(cut to fit)")));
}
