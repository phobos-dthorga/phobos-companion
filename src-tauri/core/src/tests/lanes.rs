use super::*;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

/// Waits up to two seconds for a condition another thread makes true.
fn soon(check: impl Fn() -> bool) -> bool {
    for _ in 0..200 {
        if check() {
            return true;
        }
        thread::sleep(Duration::from_millis(10));
    }
    false
}

#[test]
fn the_free_lane_never_takes_a_turn() {
    let queue = Queue::new(1);
    let _held = queue.take(Lane::Read, || {});
    assert!(queue.take(Lane::Free, || panic!("the free lane never waits")).is_none());
}

#[test]
fn a_thread_keeps_its_lane_only_within() {
    assert_eq!(current(), Lane::Free);
    let inside = within(Lane::Background, current);
    assert_eq!(inside, Lane::Background);
    assert_eq!(current(), Lane::Free);
}

#[test]
fn reads_beyond_the_limit_wait_for_a_turn_to_end() {
    let queue = Arc::new(Queue::new(2));
    let first = queue.take(Lane::Read, || {});
    let _second = queue.take(Lane::Read, || {});
    let told = Arc::new(AtomicBool::new(false));
    let (waiting, heard) = (Arc::clone(&queue), Arc::clone(&told));
    let third = thread::spawn(move || {
        let _turn = waiting.take(Lane::Read, || heard.store(true, Ordering::SeqCst));
    });
    assert!(soon(|| told.load(Ordering::SeqCst)), "the third read was told it waits");
    assert_eq!(queue.running(), (2, 0, 1));
    drop(first);
    third.join().unwrap();
    assert_eq!(queue.running(), (1, 0, 0));
}

#[test]
fn a_reading_ahead_waits_while_a_read_waits_and_runs_one_at_a_time() {
    let queue = Arc::new(Queue::new(2));
    let ahead = queue.take(Lane::Background, || {});
    // A second reading ahead waits for the first, though a turn is free.
    let started = Arc::new(AtomicBool::new(false));
    let (other, flag) = (Arc::clone(&queue), Arc::clone(&started));
    let second = thread::spawn(move || {
        let _turn = other.take(Lane::Background, || {});
        flag.store(true, Ordering::SeqCst);
    });
    thread::sleep(Duration::from_millis(50));
    assert!(!started.load(Ordering::SeqCst));
    // Reads never wait for readings ahead: two run beside the one ahead.
    let one = queue.take(Lane::Read, || panic!("a read waited for a reading ahead"));
    let two = queue.take(Lane::Read, || panic!("a read waited for a reading ahead"));
    drop(ahead);
    thread::sleep(Duration::from_millis(50));
    assert!(!started.load(Ordering::SeqCst), "the reads fill every turn, so the next reading ahead waits");
    drop(one);
    drop(two);
    second.join().unwrap();
    assert!(started.load(Ordering::SeqCst));
    assert_eq!(queue.running(), (0, 0, 0));
}
