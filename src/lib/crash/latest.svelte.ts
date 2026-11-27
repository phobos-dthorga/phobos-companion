import { started, heard, type ProgressState } from "../shell/progress";
import { lookAfterCrash, readCrashStatus } from "./desktopClient";
import type { CrashLook, CrashStatus } from "./types";

/**
 * Home's reading after a crash (0.105.0), kept outside the page so every game's Home and every return to it share one: the status
 * is read at most every half hour (about a tenth of a second); when it says a look is due, the look runs once, by itself, in the
 * background, and its answer stays for the rest of this run.
 */
const FRESH_MS = 30 * 60 * 1000;

type LookState =
  | { state: "idle" }
  | { state: "looking"; progress: ProgressState }
  | { state: "done"; look: CrashLook }
  | { state: "failed"; reason: string };

export const latest = $state<{
  status: CrashStatus | null;
  at: number;
  look: LookState;
}>({ status: null, at: 0, look: { state: "idle" } });

/** Reads the status again when the last is older than half an hour, then looks if one is due and none has run. Quiet. */
export async function refreshIfStale(): Promise<void> {
  if (Date.now() - latest.at < FRESH_MS) return;
  latest.at = Date.now();
  const answer = await readCrashStatus();
  if (answer.state !== "ready") return;
  latest.status = answer.status;
  if (answer.status.due && latest.look.state === "idle") await look();
}

async function look(): Promise<void> {
  latest.look = { state: "looking", progress: started() };
  const answer = await lookAfterCrash((m) => {
    if (latest.look.state === "looking")
      latest.look = {
        state: "looking",
        progress: heard(latest.look.progress, m),
      };
  });
  latest.look =
    answer.state === "ready"
      ? { state: "done", look: answer.look }
      : { state: "failed", reason: answer.failure.detail };
}
