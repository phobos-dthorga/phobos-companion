use super::*;

#[test]
fn takes_names_as_games_write_them_with_wildcards_for_a_search() {
    for name in ["C17_Globemaster", "Gun_*", "Steel", "Base.Thing-2", " BaseVehiclePawn ", "Gun_?"] {
        assert!(definition_name(name), "{name}");
    }
    for name in ["", "-x", "--settings=y", "a/b", "a b", "x;rm", "**", &"a".repeat(121)] {
        assert!(!definition_name(name), "{name}");
    }
}

#[test]
fn a_name_goes_after_two_dashes_and_only_the_three_looks_run() {
    let built = arguments("rimworld-defs", "patched", " C17_Globemaster ").unwrap();
    assert_eq!(built[..2], ["rimworld-defs", "patched"]);
    assert!(built.contains(&"--json".to_owned()));
    assert_eq!(built[built.len() - 2..], ["--", "C17_Globemaster"]);
    for kind in KINDS {
        assert!(arguments_ok(kind), "{kind}");
    }
    assert!(arguments("rimworld-defs", "sql", "Steel").is_err());
    assert!(arguments("rimworld-defs", "who", "-x").is_err());
}

fn arguments_ok(kind: &str) -> bool {
    arguments("rimworld-defs", kind, "Steel").is_ok()
}
