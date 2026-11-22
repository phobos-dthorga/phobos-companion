import type {
  NightlyAnswer,
  WatchFinding,
  LightState,
  NightlyRun,
  RepoChecks,
  RepoStatusAnswer,
} from "./types";

/**
 * How Home's gate lights read (0.61.0): a word for each state, always with a mark beside the colour, so colour never carries the
 * meaning alone.
 */
export type Tone = "good" | "bad" | "busy" | "quiet";

const TONES: Record<LightState, Tone> = {
  passed: "good",
  failed: "bad",
  cancelled: "bad",
  running: "busy",
  waiting: "busy",
  "no-push-checks": "quiet",
  none: "quiet",
  "not-on-github": "quiet",
  "no-upstream": "quiet",
  unknown: "quiet",
};

const MARKS: Record<Tone, string> = {
  good: "✓",
  bad: "✗",
  busy: "…",
  quiet: "–",
};

export function toneOf(state: LightState): Tone {
  return TONES[state] ?? "quiet";
}

export function markOf(state: LightState): string {
  return MARKS[toneOf(state)];
}

const LIGHT_KEYS: Record<LightState, string> = {
  passed: "lights-state-passed",
  failed: "lights-state-failed",
  cancelled: "lights-state-cancelled",
  running: "lights-state-running",
  waiting: "lights-state-waiting",
  "no-push-checks": "lights-state-no-push-checks",
  none: "lights-state-none",
  "not-on-github": "lights-state-not-on-github",
  "no-upstream": "lights-state-no-upstream",
  unknown: "lights-state-unknown",
};

/** The locale key for a light's words; a state this program does not know reads as "could not be asked". */
export function lightKey(state: LightState): string {
  return LIGHT_KEYS[state] ?? LIGHT_KEYS.unknown;
}

/** Each kind of online call's words: its name, what it does, and what stops working without it. */
type KindWords = { name: string; body: string; loss: string };

const KIND_WORDS: Record<string, KindWords> = {
  "nightly-watch": {
    name: "online-nightly-watch-name",
    body: "online-nightly-watch-body",
    loss: "online-nightly-watch-loss",
  },
  "gate-lights": {
    name: "online-gate-lights-name",
    body: "online-gate-lights-body",
    loss: "online-gate-lights-loss",
  },
};

/** The locale key for one of a kind's words; null for a kind this window has no words for yet (shown by its id). */
export function kindKey(id: string, part: keyof KindWords): string | null {
  return KIND_WORDS[id]?.[part] ?? null;
}

/** The workflows that failed, by name, for the words beside a failed light. */
export function failedWorkflows(checks: RepoChecks | undefined): string[] {
  const failed = new Set([
    "failure",
    "timed_out",
    "startup_failure",
    "action_required",
    "cancelled",
  ]);
  return (checks?.runs ?? [])
    .filter((run) => failed.has(run.conclusion ?? ""))
    .map((run) => run.workflow);
}

/** The nightly runs that have not run for two days or more. */
export function lateNightly(nightly: NightlyRun[] | undefined): NightlyRun[] {
  return (nightly ?? []).filter((run) => run.late);
}

/** The time of the oldest earlier answer shown, in seconds, or null when every answer is fresh. */
export function oldestStale(answer: RepoStatusAnswer): number | null {
  const times = answer.repositories
    .map((repo) => (repo.checks?.stale ? (repo.checks.asOf ?? null) : null))
    .filter((time): time is number => time !== null);
  return times.length > 0 ? Math.min(...times) : null;
}

/** How many calls are left this hour, when GitHub said so and the hour hasn't turned; null otherwise. */
export function callsLeft(
  answer: RepoStatusAnswer,
): { remaining: number; size: number } | null {
  const allowance = answer.allowance;
  if (!allowance || allowance.turned) return null;
  return { remaining: allowance.remaining, size: allowance.size ?? 60 };
}

/** One finding as Home lists it: which repository's watch found it, and the finding itself. */
export type ShownFinding = WatchFinding & { repository: string };

function isFinding(value: unknown): value is WatchFinding {
  const item = value as Record<string, unknown> | null;
  return (
    typeof item?.mod === "string" &&
    typeof item.commit === "string" &&
    typeof item.member === "string"
  );
}

/**
 * Every commit the nightly watches found (0.63.0), newest first, each once: the kit checked each file, but the window still reads
 * only what has the shape of a finding.
 */
export function watchFindings(answer: NightlyAnswer): ShownFinding[] {
  const seen = new Set<string>();
  const found: ShownFinding[] = [];
  for (const feed of answer.feeds) {
    for (const file of feed.files) {
      if (file.kind !== "upstream-watch") continue;
      const findings = (file.content as { findings?: unknown } | undefined)
        ?.findings;
      if (!Array.isArray(findings)) continue;
      for (const finding of findings.filter(isFinding)) {
        const key = `${feed.repository}|${finding.commit}|${finding.member}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push({ ...finding, repository: feed.repository });
      }
    }
  }
  return found.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

/** When the oldest copy shown was read, in seconds, when any is an earlier one kept because GitHub couldn't be asked. */
export function nightlyAsOf(answer: NightlyAnswer): number | null {
  const times = answer.feeds.flatMap((feed) => [
    ...(feed.stale && feed.asOf !== null ? [feed.asOf] : []),
    ...feed.files
      .filter((file) => file.state === "kept" && file.keptAt !== undefined)
      .map((file) => file.keptAt as number),
  ]);
  return times.length > 0 ? Math.min(...times) : null;
}
