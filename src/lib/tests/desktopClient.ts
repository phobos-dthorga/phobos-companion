import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
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

/** Every test list of a game, read by the host through the kit. */
export async function readTestLists(game: string): Promise<TestsReading> {
  if (inBrowser()) return BROWSER;
  return ask<TestList[], TestsReading>("test_lists", { game }, (lists) => ({
    state: "ready",
    lists,
  }));
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
