import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { CleanupListing } from "./types";

type Ready = { state: "ready"; listing: CleanupListing };

/** What could go now. Only reads. */
export async function readCleanup(
  onProgress?: OnProgress,
): Promise<Ready | Failed> {
  return ask<CleanupListing, Ready>(
    "cleanup_list",
    { onProgress: progressChannel(onProgress) },
    (listing) => ({ state: "ready", listing }),
  );
}

/** Deletes the chosen groups; the host checks the names and the kit's manifest first. Answers with what is left. */
export async function applyCleanup(
  groups: string[],
  onProgress?: OnProgress,
): Promise<Ready | Failed> {
  return ask<CleanupListing, Ready>(
    "cleanup_apply",
    { groups, onProgress: progressChannel(onProgress) },
    (listing) => ({ state: "ready", listing }),
  );
}
