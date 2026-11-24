import type { SetupRow } from "./types";

/**
 * The last rows the Setup tab or Home read (0.87.0), kept for the run of the program: Home's line reads once, not on every visit,
 * and the Setup tab brings it up to date whenever it reads.
 */
export const setupSeen = $state<{ rows: SetupRow[] | null }>({ rows: null });

export function rememberSetup(rows: SetupRow[]) {
  setupSeen.rows = rows;
}
