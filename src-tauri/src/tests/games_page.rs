use super::*;
use serde_json::json;

fn listed() -> Vec<Listed> {
    vec![
        Listed { id: "rimworld".into(), name: "RimWorld".into(), steam_app_id: None },
        Listed { id: "barotrauma".into(), name: "Something Else".into(), steam_app_id: Some(602960) },
    ]
}

#[test]
fn the_kit_is_asked_for_steams_games_with_full_paths() {
    assert_eq!(steam_arguments(), ["game-files", "steam-games", "--no-redact", "--json"]);
}

#[test]
fn a_listed_game_is_known_by_its_app_id_or_its_name() {
    assert_eq!(listed_as(&json!({"appId": 294100, "name": "RimWorld"}), &listed()).as_deref(), Some("rimworld"));
    assert_eq!(listed_as(&json!({"appId": 602960, "name": "Barotrauma"}), &listed()).as_deref(), Some("barotrauma"));
    assert_eq!(listed_as(&json!({"appId": 2300320, "name": "Farming Simulator 25"}), &listed()), None);
}
