use super::*;

#[test]
fn text_from_the_window_is_always_one_argument() {
    let arguments = Args::new("changes", "entry").given("--text", "--apply everything").json();
    assert_eq!(arguments, ["changes", "entry", "--text=--apply everything", "--json"]);
}

#[test]
fn a_checked_value_is_two_arguments_unless_it_opens_with_a_dash() {
    assert_eq!(Args::new("t", "r").pair("--mod", "Boats").done(), ["t", "r", "--mod", "Boats"]);
    assert_eq!(Args::new("t", "r").pair("--mod", "-x").done(), ["t", "r", "--mod=-x"]);
}

#[test]
fn every_repository_gets_its_own_root() {
    let arguments = Args::new("history", "timeline").roots([Path::new("one"), Path::new("two")]).flag("--all").done();
    assert_eq!(arguments, ["history", "timeline", "--root", "one", "--root", "two", "--all"]);
}
