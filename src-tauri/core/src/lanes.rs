//! Which kit runs wait their turn (0.116.0; the owner's speed round of 28 Nov 2026, "Queue heavy work"). Measured on the owner's
//! PC, a page's slow reading took three to four times as long while a dozen others ran beside it, so the slow readings now take
//! turns.
//!
//! - **Free**, every run unless a command says otherwise: as before, never waits. Presses, writes and the long runs (a memory watch,
//!   a snapshot) stay here, so a queue can never hold up something the person asked to happen.
//! - **Read**, the slow page readings: at most [`READS_AT_ONCE`] at a time, the rest in the order they asked.
//! - **Background**, readings made ahead of time (the warm-up): one at a time, and only while no Read is waiting, so a page the
//!   person opens never queues behind one. A Read never waits for a Background run.
//!
//! The lane belongs to the worker thread running the request (`within`), so the modules below the commands never pass it along.

use std::cell::Cell;
use std::sync::{Condvar, LazyLock, Mutex, MutexGuard};

/// How many slow readings run at once.
pub const READS_AT_ONCE: usize = 3;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lane {
    Free,
    Read,
    Background,
}

thread_local! {
    static LANE: Cell<Lane> = const { Cell::new(Lane::Free) };
}

/// Runs `work` with this thread's kit runs in `lane`, then puts the thread's lane back.
pub fn within<T>(lane: Lane, work: impl FnOnce() -> T) -> T {
    let before = LANE.with(|cell| cell.replace(lane));
    let answer = work();
    LANE.with(|cell| cell.set(before));
    answer
}

/// The lane this thread's kit runs are in now.
pub fn current() -> Lane {
    LANE.with(Cell::get)
}

#[derive(Debug, Default)]
struct Counts {
    reads: usize,
    background: usize,
    reads_waiting: usize,
}

/// Turns for the slow lanes: a count of what runs and waits, and a signal when a turn ends.
#[derive(Debug)]
pub struct Queue {
    limit: usize,
    counts: Mutex<Counts>,
    ended: Condvar,
}

/// A turn held while a run goes on; ending it, by drop, lets the next one go.
#[derive(Debug)]
pub struct Turn<'a> {
    queue: &'a Queue,
    lane: Lane,
}

impl Queue {
    pub fn new(limit: usize) -> Self {
        Self { limit: limit.max(1), counts: Mutex::new(Counts::default()), ended: Condvar::new() }
    }

    fn counts(&self) -> MutexGuard<'_, Counts> {
        self.counts.lock().unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    /// A turn in this lane, waiting for it first when the lane is full; None in the Free lane, which never waits. `told` hears
    /// once, when it has to wait, so a page can say why.
    pub fn take(&self, lane: Lane, told: impl FnOnce()) -> Option<Turn<'_>> {
        let mut told = Some(told);
        let mut counts = self.counts();
        match lane {
            Lane::Free => return None,
            Lane::Read => {
                counts.reads_waiting += 1;
                while counts.reads >= self.limit {
                    if let Some(tell) = told.take() {
                        tell();
                    }
                    counts = self.ended.wait(counts).unwrap_or_else(std::sync::PoisonError::into_inner);
                }
                counts.reads_waiting -= 1;
                counts.reads += 1;
            }
            Lane::Background => {
                while counts.background > 0
                    || counts.reads_waiting > 0
                    || counts.reads + counts.background >= self.limit
                {
                    if let Some(tell) = told.take() {
                        tell();
                    }
                    counts = self.ended.wait(counts).unwrap_or_else(std::sync::PoisonError::into_inner);
                }
                counts.background += 1;
            }
        }
        Some(Turn { queue: self, lane })
    }

    /// (reads running, readings ahead running, reads waiting), for tests and the activity strip.
    pub fn running(&self) -> (usize, usize, usize) {
        let counts = self.counts();
        (counts.reads, counts.background, counts.reads_waiting)
    }
}

impl Drop for Turn<'_> {
    fn drop(&mut self) {
        let mut counts = self.queue.counts();
        match self.lane {
            Lane::Read => counts.reads -= 1,
            Lane::Background => counts.background -= 1,
            Lane::Free => {}
        }
        drop(counts);
        self.queue.ended.notify_all();
    }
}

/// The program's one queue.
pub static QUEUE: LazyLock<Queue> = LazyLock::new(|| Queue::new(READS_AT_ONCE));

/// A turn for this thread's lane in the program's queue, waiting for it when it must; None in the Free lane.
pub fn turn(told: impl FnOnce()) -> Option<Turn<'static>> {
    QUEUE.take(current(), told)
}

#[cfg(test)]
#[path = "tests/lanes.rs"]
mod tests;
