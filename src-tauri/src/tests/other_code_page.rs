use super::*;
use serde_json::json;
use std::path::Path;

#[test]
fn takes_names_as_code_harmony_and_our_graph_write_them() {
    for name in [
        "Verse.Pawn.Kill",
        "Verse.Pawn:Kill",
        ".GroundRearm.FindFallback",
        "Outer+Inner.Go",
        "List`1",
        "Dictionary<string, int>",
    ] {
        assert!(type_name(name), "{name}");
    }
    for name in ["", "--settings=x", "a/b", "a\\b", "x;rm", "12345", &"a".repeat(301)] {
        assert!(!type_name(name), "{name}");
    }
}

#[test]
fn a_name_goes_after_two_dashes_so_it_is_never_an_option() {
    let arguments = their_arguments("rimworld-code", "show", Path::new("/repo"), "Verse.Pawn.Kill").unwrap();
    assert_eq!(arguments[..2], ["rimworld-code", "show"]);
    assert_eq!(arguments[arguments.len() - 2..], ["--", "Verse.Pawn.Kill"]);
    assert!(arguments.contains(&"--json".to_owned()));
    assert!(their_arguments("rimworld-code", "decompile", Path::new("/repo"), "Verse.Pawn").is_err());
    assert!(their_arguments("rimworld-code", "show", Path::new("/repo"), "-x").is_err());
}

#[test]
fn decompiles_only_what_holder_named() {
    assert!(!was_held("C:/Elsewhere/Thing.dll"));
    remember_holders(&json!({"holders": [{"path": "C:/Game/Assembly-CSharp.dll"}]}));
    assert!(was_held("C:/Game/Assembly-CSharp.dll"));
    assert!(!was_held("C:/Game/Other.dll"));
}

#[test]
fn update_requests_are_a_list_or_one_checked_file() {
    let list = update_arguments("rimworld-archive", None, None, None).unwrap();
    assert_eq!(list[..2], ["rimworld-archive", "list"]);
    let compare = update_arguments(
        "rimworld-archive",
        Some("Vehicles.dll"),
        Some("smashphil.vehicleframework"),
        Some("Vehicles.VehicleTurret.Fire"),
    )
    .unwrap();
    assert_eq!(compare[compare.len() - 2..], ["--", "Vehicles.dll"]);
    assert!(compare.contains(&"--owner=smashphil.vehicleframework".to_owned()));
    assert!(compare.contains(&"--show=Vehicles.VehicleTurret.Fire".to_owned()));
    assert!(update_arguments("rimworld-archive", Some("../secret.dll"), None, None).is_err());
    assert!(update_arguments("rimworld-archive", Some("notes.txt"), None, None).is_err());
    assert!(update_arguments("rimworld-archive", Some("A.dll"), Some("--evil"), None).is_err());
}

#[test]
fn the_check_after_an_update_takes_a_repository_and_a_checked_moment() {
    let root = std::path::Path::new("C:/Repos/phobos-rimworld");
    let plain = update_check_arguments("rimworld-update-check", root, None).unwrap();
    assert_eq!(plain[0], "rimworld-update-check");
    assert!(plain.contains(&"--root".to_owned()));
    assert_eq!(plain.last().map(String::as_str), Some("--json"));
    let since = update_check_arguments("rimworld-update-check", root, Some("2026-11-19T10:00:00.000Z")).unwrap();
    assert!(since.contains(&"--since=2026-11-19T10:00:00.000Z".to_owned()));
    assert!(update_check_arguments("rimworld-update-check", root, Some("--only names")).is_err());
    assert!(update_check_arguments("rimworld-update-check", root, Some("yesterday")).is_err());
}

#[test]
fn a_refusal_in_the_data_is_a_refusal() {
    let answer = Answer::of(&json!({"report": {}, "data": {"ok": false, "reason": "No assembly at x"}}));
    assert!(answer.available);
    assert!(!answer.ok);
    assert_eq!(answer.refusal.as_deref(), Some("No assembly at x"));
    assert!(!Answer::missing().available);
}

#[test]
fn only_a_row_the_last_check_asked_about_can_be_marked_read() {
    let data = json!({"temporary": [
        {"row": "6 (Harrier)", "status": "changed", "build": "3d9ff12528d1"},
        {"row": 12, "status": "removed", "build": "46d03aa5af07"},
        {"row": 2, "status": "unchanged", "build": "aaaaaaaaaaaa"},
        {"row": 27, "status": "reviewed", "build": "bbbbbbbbbbbb"},
        {"row": 3, "status": "changed"},
    ]});
    remember_touched("marking-game", "marking-repo", &data);
    assert!(was_touched("marking-game", "marking-repo", "6 (Harrier)", "3d9ff12528d1"));
    assert!(was_touched("marking-game", "marking-repo", "12", "46d03aa5af07"));
    assert!(!was_touched("marking-game", "marking-repo", "6 (Harrier)", "46d03aa5af07"), "another build");
    assert!(!was_touched("marking-game", "marking-repo", "2", "aaaaaaaaaaaa"), "not asked about");
    assert!(!was_touched("marking-game", "marking-repo", "27", "bbbbbbbbbbbb"), "already reviewed");
    assert!(!was_touched("marking-game", "other-repo", "12", "46d03aa5af07"));
    // A later check replaces the repository's rows.
    remember_touched("marking-game", "marking-repo", &json!({"temporary": []}));
    assert!(!was_touched("marking-game", "marking-repo", "12", "46d03aa5af07"));
}

#[test]
fn a_mark_names_its_kind_and_row_as_one_argument_each() {
    let arguments = mark_arguments(Path::new("/repo"), "6 (Harrier)", "3d9ff12528d1", false).unwrap();
    assert_eq!(arguments[..2], ["reviews", "mark"]);
    assert!(arguments.contains(&"--id=6 (Harrier)".to_owned()), "{arguments:?}");
    assert!(arguments.contains(&"--build=3d9ff12528d1".to_owned()), "{arguments:?}");
    assert!(arguments.windows(2).any(|w| w == ["--kind", "temporary-patch"]), "{arguments:?}");
    let cleared = mark_arguments(Path::new("/repo"), "6 (Harrier)", "3d9ff12528d1", true).unwrap();
    assert!(cleared.contains(&"--clear".to_owned()) && !cleared.iter().any(|a| a.starts_with("--build")));
    for (row, build) in [
        ("", "3d9ff12528d1"),
        ("a\nb", "3d9ff12528d1"),
        (&*"x".repeat(121), "3d9ff12528d1"),
        ("6", "xyz123"),
        ("6", "abc"),
    ] {
        assert!(mark_arguments(Path::new("/repo"), row, build, false).is_err(), "{row:?} {build:?}");
    }
}
