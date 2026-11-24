import { readSetup } from "./desktopClient";
import type { SetupRow } from "./types";

/**
 * The last rows the Setup tab or Home read (0.87.0), kept for the run of the program: Home's line reads once, not on every visit,
 * and the Setup tab brings it up to date whenever it reads.
 */
export const setupSeen = $state<{ rows: SetupRow[] | null }>({ rows: null });

export function rememberSetup(rows: SetupRow[]) {
  setupSeen.rows = rows;
}

let asked = false;

/** Reads the setup once a run of the program, for Home's line and the pages' (0.88.0); the Setup tab reads it again itself. */
export function readSetupOnce() {
  if (asked || setupSeen.rows !== null) return;
  asked = true;
  void readSetup().then((answer) => {
    if (answer.state === "ready") rememberSetup(answer.setup.rows);
  });
}
