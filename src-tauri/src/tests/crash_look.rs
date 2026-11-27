use super::*;
use serde_json::json;

#[test]
fn a_status_reads_the_shutdown_the_last_look_and_the_dumps() {
    let zeroed = json!({"lastShutdown": "2026-11-22T15:24:15+00:00", "lastCheck": null, "due": true, "days": 6});
    let dumps = json!({"dumps": [
        {"file": "RimWorld.exe.70556.dmp", "program": "RimWorld", "time": "2026-11-23T13:02:24+00:00", "size": 73314872},
        {"file": "odd.dmp", "program": "odd"},
    ]});
    let status = status_of(&zeroed, &dumps);
    assert_eq!(status.last_shutdown.as_deref(), Some("2026-11-22T15:24:15+00:00"));
    assert_eq!((status.last_check, status.due, status.days), (None, true, 6));
    assert_eq!(status.dumps.len(), 1, "a dump of the wrong shape is passed over");
    assert_eq!(status.dumps[0].program, "RimWorld");
    let quiet = status_of(&json!({"lastShutdown": "", "due": false}), &json!({}));
    assert_eq!((quiet.last_shutdown, quiet.due, quiet.days, quiet.dumps.len()), (None, false, 3, 0));
}

#[test]
fn a_look_reaches_back_no_less_than_three_days_and_no_more_than_thirty() {
    assert_eq!(days_of(&json!(1)), 3);
    assert_eq!(days_of(&json!(6)), 6);
    assert_eq!(days_of(&json!(400)), 30);
    assert_eq!(days_of(&json!("6")), 3);
    let arguments = look_arguments(400);
    assert_eq!(arguments[..2], ["zeroed", "check"]);
    assert!(arguments.windows(2).any(|w| w == ["--days", "30"]), "{arguments:?}");
}

#[test]
fn the_readings_carry_only_the_programs_own_words() {
    assert_eq!(status_arguments(), ["zeroed", "status", "--json"]);
    let dumps = dumps_arguments();
    assert_eq!(dumps[0], "crash-dump");
    assert!(dumps.contains(&"--list".to_owned()) && dumps.contains(&"--json".to_owned()));
    assert!(!dumps.iter().any(|a| a.ends_with(".dmp")), "no dump is opened");
}
