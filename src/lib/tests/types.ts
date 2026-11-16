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
  verdict: Verdict | null;
  pending: string | null;
};

export type TestList = {
  repository: string;
  title: string;
  rows: TestRow[];
  command_line: string;
};

export type Recorded = { row: string; verdict: VerdictWord; time: string };

export type TestsReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; lists: TestList[] }
  | { state: "failed"; failure: Failure };

export type RecordReading =
  | { state: "ready"; recorded: Recorded }
  | { state: "failed"; failure: Failure };
