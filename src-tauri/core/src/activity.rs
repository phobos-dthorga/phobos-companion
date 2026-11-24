//! The computer's activity in the status bar (0.86.0; the owner, 25 Nov 2026: "a little display of your system activity, perhaps
//! things like CPU, Disk, and Network", and by card: the whole PC with the Companion's share beside it; CPU, memory, disk and
//! network; numbers with a tiny graph of the last minute, in the status bar). Game-free.
//!
//! Once a second the sampler reads the whole computer's CPU, memory, disk reading and writing, and network traffic, and the part
//! taken by **the Companion and every program it started** (the tool kit's Python, an agent and its commands): its own process and
//! all of their descendants, found by their parents. **Network has no share**: Windows says how much each card carried, not which
//! program it carried it for. The last minute is kept; the window asks for it and draws it. It only reads.
//!
//! **What a reading costs** (measured on the owner's PC, 470 processes, 25 Nov 2026): reading every process each second took about
//! 28 ms of the 33 a reading took. So the list of processes, and with it who belongs to the Companion's family, is read every
//! `LIST_EVERY` readings, and only the family each second: about 18 ms a second, under 2% of one processor. A program the Companion
//! starts joins its share within that many seconds.

use serde::Serialize;
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use sysinfo::{Disks, Networks, Pid, ProcessRefreshKind, ProcessesToUpdate, System};

/// How often it reads, and how many readings are kept (the last minute).
pub const EVERY: Duration = Duration::from_secs(1);
pub const KEPT: usize = 60;
/// How many readings pass between readings of the whole list of processes.
pub const LIST_EVERY: u32 = 5;

/// The part taken by the Companion and every program it started.
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Share {
    /// Of all the computer's processors together, 0 to 100.
    pub cpu: f32,
    /// Bytes.
    pub memory: u64,
    /// Bytes a second.
    pub disk_read: u64,
    pub disk_write: u64,
}

/// One reading of the whole computer, and the Companion's share of it.
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Sample {
    /// When, in Unix milliseconds.
    pub at: u64,
    /// 0 to 100.
    pub cpu: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    /// Bytes a second, every disk together.
    pub disk_read: u64,
    pub disk_write: u64,
    /// Bytes a second, every network card together but the computer's own loopback.
    pub net_down: u64,
    pub net_up: u64,
    pub ours: Share,
}

/// Bytes counted over `elapsed`, as bytes a second.
pub fn per_second(bytes: u64, elapsed: Duration) -> u64 {
    let seconds = elapsed.as_secs_f64();
    if seconds <= 0.0 { 0 } else { (bytes as f64 / seconds).round() as u64 }
}

/// A process's share of the processors (sysinfo counts one processor as 100), as a share of all of them, 0 to 100.
pub fn of_all(usage: f32, processors: usize) -> f32 {
    if processors == 0 { 0.0 } else { (usage / processors as f32).clamp(0.0, 100.0) }
}

/// `root` and every process that descends from it, by each process's parent.
pub fn family(root: u32, parents: &HashMap<u32, Option<u32>>) -> HashSet<u32> {
    let mut found = HashSet::from([root]);
    // Each pass adds the children of what is found; a family is shallow, and a loop in the parents (a reused id) stops it.
    loop {
        let before = found.len();
        for (child, parent) in parents {
            if parent.is_some_and(|p| found.contains(&p)) {
                found.insert(*child);
            }
        }
        if found.len() == before {
            return found;
        }
    }
}

/// Whether a network card is the computer's own loopback, which carries nothing over a network.
pub fn loopback(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    name == "lo" || name.contains("loopback")
}

/// What reads the computer: kept between readings, since every rate is the difference since the last one.
pub struct Sampler {
    system: System,
    disks: Disks,
    networks: Networks,
    last: Instant,
    ours: u32,
    /// The Companion's family as last listed, and readings since the list was read.
    family: Vec<Pid>,
    since_list: u32,
}

impl Sampler {
    pub fn new() -> Result<Self, String> {
        let mut system = System::new().map_err(|e| e.to_string())?;
        system.refresh_cpu_usage();
        system.refresh_memory();
        let disks = Disks::new_with_refreshed_list().map_err(|e| e.to_string())?;
        let networks = Networks::new_with_refreshed_list().map_err(|e| e.to_string())?;
        Ok(Self {
            system,
            disks,
            networks,
            last: Instant::now(),
            ours: std::process::id(),
            family: Vec::new(),
            since_list: LIST_EVERY,
        })
    }

    /// One reading, of the time since the last.
    pub fn sample(&mut self) -> Sample {
        let elapsed = self.last.elapsed();
        self.last = Instant::now();
        self.system.refresh_cpu_usage();
        self.system.refresh_memory();
        if self.since_list >= LIST_EVERY {
            self.system.refresh_processes_specifics(ProcessesToUpdate::All, true, ProcessRefreshKind::nothing());
            let parents: HashMap<u32, Option<u32>> = self
                .system
                .processes()
                .iter()
                .map(|(pid, process)| (pid.as_u32(), process.parent().map(Pid::as_u32)))
                .collect();
            self.family = family(self.ours, &parents).into_iter().map(Pid::from_u32).collect();
            self.since_list = 0;
        }
        self.since_list += 1;
        self.system.refresh_processes_specifics(
            ProcessesToUpdate::Some(&self.family),
            true,
            ProcessRefreshKind::nothing().with_cpu().with_memory().with_disk_usage(),
        );
        self.disks.refresh(true);
        self.networks.refresh(true);
        let processors = self.system.cpus().len();
        let mut share = Share::default();
        let (mut read, mut written) = (0u64, 0u64);
        for pid in &self.family {
            if let Some(process) = self.system.process(*pid) {
                let disk = process.disk_usage();
                share.cpu += of_all(process.cpu_usage(), processors);
                share.memory += process.memory();
                read += disk.read_bytes;
                written += disk.written_bytes;
            }
        }
        share.cpu = share.cpu.min(100.0);
        share.disk_read = per_second(read, elapsed);
        share.disk_write = per_second(written, elapsed);
        let (disk_read, disk_write) = self
            .disks
            .iter()
            .map(|disk| disk.usage())
            .fold((0u64, 0u64), |(r, w), u| (r + u.read_bytes, w + u.written_bytes));
        let (down, up) = self
            .networks
            .iter()
            .filter(|(name, _)| !loopback(&name.to_string_lossy()))
            .fold((0u64, 0u64), |(d, u), (_, data)| (d + data.received(), u + data.transmitted()));
        Sample {
            at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or_default(),
            cpu: self.system.global_cpu_usage().clamp(0.0, 100.0),
            memory_used: self.system.used_memory(),
            memory_total: self.system.total_memory(),
            disk_read: per_second(disk_read, elapsed),
            disk_write: per_second(disk_write, elapsed),
            net_down: per_second(down, elapsed),
            net_up: per_second(up, elapsed),
            ours: share,
        }
    }
}

/// The last minute of readings, oldest first.
static KEPT_SAMPLES: Mutex<VecDeque<Sample>> = Mutex::new(VecDeque::new());

/// Keeps a reading, dropping the oldest past a minute.
pub fn keep(sample: Sample) {
    if let Ok(mut kept) = KEPT_SAMPLES.lock() {
        kept.push_back(sample);
        while kept.len() > KEPT {
            kept.pop_front();
        }
    }
}

/// The last minute, oldest first.
pub fn recent() -> Vec<Sample> {
    KEPT_SAMPLES.lock().map(|k| k.iter().copied().collect()).unwrap_or_default()
}

/// Reads once a second for as long as the program runs, on a thread of its own. The first reading only sets the counters.
pub fn start() {
    std::thread::spawn(|| {
        let Ok(mut sampler) = Sampler::new() else { return };
        std::thread::sleep(EVERY);
        loop {
            keep(sampler.sample());
            std::thread::sleep(EVERY);
        }
    });
}

#[cfg(test)]
#[path = "tests/activity.rs"]
mod tests;
