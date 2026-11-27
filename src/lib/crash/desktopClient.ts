import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { CrashLook, CrashStatus } from "./types";

/** The crash dumps kept, and whether a look is due (0.105.0). Quick; only reads. */
export async function readCrashStatus(): Promise<
  { state: "ready"; status: CrashStatus } | Failed
> {
  return ask<CrashStatus, { state: "ready"; status: CrashStatus }>(
    "crash_status",
    {},
    (status) => ({ state: "ready", status }),
  );
}

/** Looks for files a crash left filled with zeros; the host refuses when none is due (0.105.0). Only reads. */
export async function lookAfterCrash(
  onProgress?: OnProgress,
): Promise<{ state: "ready"; look: CrashLook } | Failed> {
  return ask<CrashLook, { state: "ready"; look: CrashLook }>(
    "crash_look_now",
    { onProgress: progressChannel(onProgress) },
    (look) => ({ state: "ready", look }),
  );
}
