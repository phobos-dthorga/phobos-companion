use super::*;

#[test]
fn bytes_counted_become_bytes_a_second() {
    assert_eq!(per_second(3_000, Duration::from_millis(1500)), 2_000);
    assert_eq!(per_second(1_000, Duration::ZERO), 0, "no time, no rate");
}

#[test]
fn a_programs_processors_are_a_share_of_them_all() {
    assert!((of_all(200.0, 8) - 25.0).abs() < 0.01, "two of eight processors are a quarter");
    assert_eq!(of_all(900.0, 8), 100.0);
    assert_eq!(of_all(50.0, 0), 0.0);
}

#[test]
fn the_companions_share_is_it_and_everything_it_started() {
    // 10 is the Companion; 11 the kit's Python it started, 12 a command that started; 20 another program, 21 its child.
    let parents =
        HashMap::from([(10, Some(1)), (11, Some(10)), (12, Some(11)), (20, Some(1)), (21, Some(20)), (30, None)]);
    assert_eq!(family(10, &parents), HashSet::from([10, 11, 12]));
    // A loop in the parents (an id the system reused) still ends.
    let looped = HashMap::from([(10, Some(11)), (11, Some(10))]);
    assert_eq!(family(10, &looped), HashSet::from([10, 11]));
}

#[test]
fn the_loopback_carries_nothing_over_a_network() {
    assert!(loopback("Loopback Pseudo-Interface 1"));
    assert!(loopback("lo"));
    assert!(!loopback("Ethernet"));
    assert!(!loopback("Wi-Fi"));
}

#[test]
fn only_the_last_minute_is_kept() {
    for second in 0..(KEPT as u64 + 5) {
        keep(Sample { at: second, ..Sample::default() });
    }
    let kept = recent();
    assert_eq!(kept.len(), KEPT);
    assert_eq!(kept.last().unwrap().at, KEPT as u64 + 4, "the newest last");
}

#[test]
fn a_real_reading_of_this_computer_makes_sense() {
    let mut sampler = Sampler::new().expect("the computer can be read");
    std::thread::sleep(Duration::from_millis(300));
    let sample = sampler.sample();
    assert!((0.0..=100.0).contains(&sample.cpu));
    assert!(sample.memory_total > 0 && sample.memory_used <= sample.memory_total);
    assert!(sample.ours.memory > 0, "this test is part of the family it reads");
    assert!(sample.ours.memory <= sample.memory_total);
    assert_eq!(serde_json::to_value(sample.ours).unwrap()["diskRead"], sample.ours.disk_read);
}

/// How long one reading takes on this computer: run by hand with `--ignored --nocapture` (0.86.0: about the cost of a reading a
/// second, measured before it was shipped).
#[test]
#[ignore]
fn how_long_a_reading_takes() {
    let mut sampler = Sampler::new().unwrap();
    let mut times = Vec::new();
    for _ in 0..10 {
        std::thread::sleep(Duration::from_millis(500));
        let started = Instant::now();
        let sample = sampler.sample();
        times.push(started.elapsed());
        assert!(sample.memory_total > 0);
    }
    times.sort();
    println!("a reading: median {:?}, slowest {:?}", times[times.len() / 2], times[times.len() - 1]);
}
