/** Going online (0.61.0, `docs/online.md`): the kinds of call the program makes by itself, and Home's gate lights. */

/** How much stops working when a kind is switched off: a severe one is warned of before it is switched off. */
export type Loss = "small" | "severe";

export type OnlineKind = {
  id: string;
  /** The address it contacts, as a person would recognise it. */
  contacts: string;
  loss: Loss;
  on: boolean;
  /** Whether on or off is the person's choice, or the default (on). */
  chosen: boolean;
};

export type OnlineStatus = { kinds: OnlineKind[] };

/** What a repository's last push came to on GitHub, as the kit's `repos status` names it. */
export type LightState =
  | "passed"
  | "failed"
  | "running"
  | "cancelled"
  | "waiting"
  | "no-push-checks"
  | "none"
  | "not-on-github"
  | "no-upstream"
  | "unknown";

export type CheckRun = {
  workflow: string;
  event: string | null;
  status: string | null;
  conclusion: string | null;
  commit: string;
  when: string | null;
  link: string | null;
};

export type RepoChecks = {
  state: LightState;
  runs: CheckRun[];
  /** True when GitHub could not be asked and this is an earlier answer, from `asOf` (seconds). */
  stale?: boolean;
  asOf?: number | null;
  /** Why GitHub could not be asked, when there was no earlier answer. */
  why?: string;
};

export type NightlyRun = CheckRun & { late: boolean };

export type RepoStatus = {
  name: string;
  root: string;
  branch: string | null;
  upstream: string | null;
  github: string | null;
  pushed: string | null;
  ahead: number | null;
  behind: number | null;
  changed: number | null;
  scheduled: boolean;
  checks?: RepoChecks;
  nightly?: NightlyRun[];
};

export type Allowance = {
  remaining: number;
  size: number | null;
  reset: number | null;
  seen_at: number;
  turned: boolean;
};

export type RepoStatusAnswer = {
  repositories: RepoStatus[];
  /** Whether GitHub was asked in this look. */
  online: boolean;
  /** Whether the person left Gate lights on. */
  switchedOn: boolean;
  allowance?: Allowance | null;
  limited?: string | null;
};

/** One commit the nightly watch found in another author's public source touching a member our code names (0.63.0). */
export type WatchFinding = {
  mod: string;
  commit: string;
  member: string;
  date?: string;
  subject?: string;
  /** Our file and line that names the member. */
  ours?: string;
  link?: string | null;
};

/** One file of a feed, as the kit read and checked it. */
export type FeedFile = {
  path: string;
  kind: string | null;
  state: "new" | "same" | "kept" | "failed" | "refused";
  why?: string;
  content?: unknown;
  keptAt?: number;
};

export type Feed = {
  source: string;
  repository: string;
  state: "read" | "missing" | "unreachable" | "refused";
  feed?: string;
  updated?: string;
  stale: boolean;
  asOf: number | null;
  files: FeedFile[];
};

export type NightlyAnswer = { feeds: Feed[]; switchedOn: boolean };
