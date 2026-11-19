import { ask } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { Automatic, BackupResult, RecordsStatus } from "./types";

/** The last copy the timer made or tried in this run, or null when it has not tried yet (0.29.0). */
export async function readAutomatic(): Promise<
  { state: "ready"; automatic: Automatic | null } | Failed
> {
  return ask<Automatic | null, { state: "ready"; automatic: Automatic | null }>(
    "records_automatic",
    {},
    (automatic) => ({ state: "ready", automatic }),
  );
}

/** What a copy of the Companion's records would hold, where it goes, and the copies already there. */
export async function readRecordsStatus(): Promise<
  { state: "ready"; status: RecordsStatus } | Failed
> {
  return ask<RecordsStatus, { state: "ready"; status: RecordsStatus }>(
    "records_status",
    {},
    (status) => ({ state: "ready", status }),
  );
}

/** Copies the records into a new dated folder in the chosen folder. The host checks the kit's manifest first. */
export async function backupRecords(): Promise<
  { state: "done"; result: BackupResult } | Failed
> {
  return ask<BackupResult, { state: "done"; result: BackupResult }>(
    "backup_records",
    {},
    (result) => ({ state: "done", result }),
  );
}
