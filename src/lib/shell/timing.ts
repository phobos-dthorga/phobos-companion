/**
 * How long work took before, so a bar for work that cannot be counted can fill against it and say about how long is left (0.21.0).
 * Kept in this window's own storage, a convenience only: without it a bar simply moves as it always did.
 */
const STORE = "dthorga-companion.timings.v1";
/** Work shorter than this is not worth remembering or estimating. */
export const WORTH_TIMING_MS = 400;
/** A bar filled by an estimate stops short of full, since the estimate may be wrong. */
const ESTIMATE_CEILING = 0.95;
const KEPT = 200;

type Timings = Record<string, { ms: number; at: number }>;

function load(): Timings {
  try {
    const text = globalThis.localStorage?.getItem(STORE);
    return text ? (JSON.parse(text) as Timings) : {};
  } catch {
    return {};
  }
}

function save(timings: Timings): void {
  try {
    const newest = Object.entries(timings)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, KEPT);
    globalThis.localStorage?.setItem(
      STORE,
      JSON.stringify(Object.fromEntries(newest)),
    );
  } catch {
    // Storage refused: estimates are a convenience.
  }
}

/** How long this work took before (an average leaning on the latest), or null when it has not been timed. */
export function expectedMs(task: string): number | null {
  const found = load()[task];
  return found && found.ms >= WORTH_TIMING_MS ? found.ms : null;
}

/** Remembers how long this work took: half the last figure and half this one, so a change shows within a run or two. */
export function remember(task: string, ms: number, now = Date.now()): void {
  if (!task || ms < WORTH_TIMING_MS) return;
  const timings = load();
  const before = timings[task]?.ms;
  timings[task] = {
    ms: before ? Math.round((before + ms) / 2) : Math.round(ms),
    at: now,
  };
  save(timings);
}

/** How full a bar is against what the work took before, and about how many seconds are left (null once past it). */
export function estimate(
  elapsedMs: number,
  expected: number,
): { share: number; secondsLeft: number | null } {
  const share = Math.min(ESTIMATE_CEILING, Math.max(0, elapsedMs / expected));
  const left = expected - elapsedMs;
  return {
    share,
    secondsLeft: left > 0 ? Math.max(1, Math.ceil(left / 1000)) : null,
  };
}
