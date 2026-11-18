import type { Failure } from "../shell/types";

/** What the game has seen working, from its seen-in-play notes (phobos-modkit test-pass). */
export type Sighting = {
  key: string;
  first: string;
  last: string;
  count: number;
  mod: string;
  version: string;
  detail: string;
};

/** One seen-in-play note as the kit gives it back (kit 1.19.0). */
export type SeenNote = {
  key: string;
  time: string;
  mod: string;
  version: string;
  detail: string;
  on: string;
  kind: string;
  variant: string;
  values: Record<string, number>;
};

/**
 * What the notes say of one part of a row (kit 1.19.0): none; seen; expected (seen, with the figures the row expects); off (seen,
 * never with them); stale (seen only on a version older than the row).
 */
export type PartState = "none" | "seen" | "expected" | "off" | "stale";

export type PartCheck = {
  name: string;
  state: PartState;
  seen: number;
  expected: string[];
  off: SeenNote[];
  stale: number;
  stale_version: string;
};

/** A note that came without the one that should come before it on the same thing. */
export type OrderProblem = {
  rule: string;
  row: string;
  on: string;
  kind: string;
  time: string;
  detail: string;
};

export type VerdictWord = "passed" | "failed" | "cleared";

export type Verdict = { verdict: VerdictWord; time: string; note: string };

/** One row of a test list, as phobos-modkit's test-pass report gives it. */
export type TestRow = {
  id: string;
  section: string;
  title: string;
  status: "open" | "partial" | "passed" | "failed" | "seen";
  cells: Record<string, string>;
  seen: Sighting[];
  evidence_keys: string[];
  parts?: PartCheck[];
  kinds?: string[];
  versions?: Record<string, string>;
  order_problems?: OrderProblem[];
  verdict: Verdict | null;
  pending: string | null;
};

export type DecisionWord = "make-row" | "no-row" | "cleared";

/** A note no row names, with the owner's decision on it. */
export type Unrowed = {
  key: string;
  count: number;
  last: string;
  detail: string;
  decision: "make-row" | "no-row" | null;
  note: string;
};

export type TestList = {
  repository: string;
  title: string;
  rows: TestRow[];
  unrowed: Unrowed[];
  order_problems: OrderProblem[];
  command_line: string;
};

export type Recorded = { row: string; verdict: VerdictWord; time: string };

export type RecordedDecision = {
  key: string;
  decision: DecisionWord;
  time: string;
};

export type TestsReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; lists: TestList[] }
  | { state: "failed"; failure: Failure };

export type RecordReading =
  | { state: "ready"; recorded: Recorded }
  | { state: "failed"; failure: Failure };

export type DecisionReading =
  | { state: "ready"; recorded: RecordedDecision }
  | { state: "failed"; failure: Failure };
