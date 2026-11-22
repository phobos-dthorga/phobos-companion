use super::*;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT: AtomicUsize = AtomicUsize::new(0);

fn scratch() -> PathBuf {
    let folder = env::temp_dir().join(format!(
        "companion-online-{}-{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::SeqCst)
    ));
    fs::create_dir_all(&folder).unwrap();
    folder
}

#[test]
fn every_kind_starts_on_as_the_owner_chose() {
    let data = scratch();
    let answer = status(&data);
    assert!(!answer.kinds.is_empty());
    assert!(answer.kinds.iter().all(|kind| kind.on && !kind.chosen));
    assert!(is_on(&data, "gate-lights"));
    fs::remove_dir_all(&data).unwrap();
}

#[test]
fn a_kind_switched_off_stays_off_and_says_it_was_chosen() {
    let data = scratch();
    let answer = choose(&data, "gate-lights", false).unwrap();
    let lights = answer.kinds.iter().find(|kind| kind.id == "gate-lights").unwrap();
    assert!(!lights.on && lights.chosen);
    assert!(!is_on(&data, "gate-lights"));
    choose(&data, "gate-lights", true).unwrap();
    assert!(is_on(&data, "gate-lights"));
    fs::remove_dir_all(&data).unwrap();
}

#[test]
fn a_kind_the_program_does_not_have_is_refused_and_nothing_written() {
    let data = scratch();
    assert!(choose(&data, "telemetry", true).is_err());
    assert!(!data.join(FILE).exists());
    assert!(!is_on(&data, "telemetry"));
    fs::remove_dir_all(&data).unwrap();
}

#[test]
fn an_unreadable_file_leaves_every_kind_on() {
    let data = scratch();
    fs::write(data.join(FILE), "not json").unwrap();
    assert!(is_on(&data, "gate-lights"));
    fs::remove_dir_all(&data).unwrap();
}
