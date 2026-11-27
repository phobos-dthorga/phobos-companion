import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
  readKept,
} from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { CodePlaces } from "./links";
import type {
  DecisionReading,
  DecisionWord,
  Recorded,
  RecordedDecision,
  RecordReading,
  TestList,
  TestsReading,
  VerdictWord,
} from "./types";

const listsReady = (lists: TestList[]): TestsReading => ({
  state: "ready",
  lists,
});

/** Every test list of a game, read by the host through the kit; `ahead` when the window reads it ahead (0.116.0). */
export async function readTestLists(
  game: string,
  ahead = false,
): Promise<TestsReading> {
  if (inBrowser()) return BROWSER;
  return ask<TestList[], TestsReading>(
    "test_lists",
    { game, ahead },
    listsReady,
  );
}

/** The test lists as last read, with when (0.116.0); null when none were kept. */
export function keptTestLists(game: string) {
  return readKept<TestList[], TestsReading>("test_lists", [game], listsReady);
}

/** Asks the host to record the owner's verdict on one row. The host checks it before writing. */
export async function recordVerdict(
  game: string,
  repository: string,
  row: string,
  verdict: VerdictWord,
  note: string,
): Promise<RecordReading> {
  return ask<Recorded, RecordReading>(
    "record_verdict",
    { game, repository, row, verdict, note },
    (recorded) => ({ state: "ready", recorded }),
  );
}

/** Asks the host to record the owner's decision on a note no row names. The host checks it before writing. */
export async function recordKeyDecision(
  game: string,
  repository: string,
  key: string,
  decision: DecisionWord,
  note: string,
): Promise<DecisionReading> {
  return ask<RecordedDecision, DecisionReading>(
    "record_key_decision",
    { game, repository, key, decision, note },
    (recorded) => ({ state: "ready", recorded }),
  );
}

/** Where one repository's code notes each of its test rows (kit 1.36.0), or why it could not be read. */
export async function readTestCode(
  game: string,
  repository: string,
  ahead = false,
): Promise<{ state: "ready"; code: CodePlaces } | Failed> {
  return ask<CodePlaces, { state: "ready"; code: CodePlaces }>(
    "test_code",
    { game, repository, ahead, onProgress: progressChannel() },
    (code) => ({ state: "ready", code }),
  );
}

/** Where the code notes each row, as last read (0.116.0); null when it was not kept. */
export function keptTestCode(game: string, repository: string) {
  return readKept<CodePlaces, { state: "ready"; code: CodePlaces }>(
    "test_code",
    [game, repository],
    (code) => ({ state: "ready", code }),
  );
}
