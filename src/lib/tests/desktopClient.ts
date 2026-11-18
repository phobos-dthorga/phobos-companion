import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Failure } from "../shell/types";
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
  if (!isTauri()) return { state: "browser" };
  try {
    const lists = await invoke<TestList[]>("test_lists", { game });
    return { state: "ready", lists };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}

/** Asks the host to record the owner's verdict on one row. The host checks it before writing. */
export async function recordVerdict(
  game: string,
  repository: string,
  row: string,
  verdict: VerdictWord,
  note: string,
): Promise<RecordReading> {
  try {
    const recorded = await invoke<Recorded>("record_verdict", {
      game,
      repository,
      row,
      verdict,
      note,
    });
    return { state: "ready", recorded };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}

/** Asks the host to record the owner's decision on a note no row names. The host checks it before writing. */
export async function recordKeyDecision(
  game: string,
  repository: string,
  key: string,
  decision: DecisionWord,
  note: string,
): Promise<DecisionReading> {
  try {
    const recorded = await invoke<RecordedDecision>("record_key_decision", {
      game,
      repository,
      key,
      decision,
      note,
    });
    return { state: "ready", recorded };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}
