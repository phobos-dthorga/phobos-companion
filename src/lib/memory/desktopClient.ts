import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type {
  MemoryReading,
  ReportReading,
  StartChoice,
  StatusData,
  StatusReading,
  StepReading,
  StepResult,
} from "./types";

/** The game's memory watch as it stands: the running one, else the newest, or the one named; the host says when it has none. */
export async function readStatus(
  game: string,
  watch: string | null,
  onProgress?: OnProgress,
): Promise<StatusReading> {
  if (inBrowser()) return BROWSER;
  return ask<MemoryReading, StatusReading>(
    "memory_status",
    { game, watch, onProgress: progressChannel(onProgress) },
    (reading) => ({
      state: "ready",
      reading,
      status: reading.available ? (reading.data as StatusData) : null,
    }),
  );
}

/** A kept watch's whole report. */
export async function readReport(
  game: string,
  watch: string,
  onProgress?: OnProgress,
): Promise<ReportReading> {
  if (inBrowser()) return BROWSER;
  return ask<MemoryReading, ReportReading>(
    "memory_report",
    { game, watch, onProgress: progressChannel(onProgress) },
    (reading) => ({ state: "ready", reading }),
  );
}

/**
 * Starts a watch, on the owner's press and confirmation. The answer comes when the watch ends, minutes later, with its report;
 * the page follows it meanwhile with `readStatus`, and the progress heard here fills the bar.
 */
export async function startWatch(
  game: string,
  choice: StartChoice,
  onProgress?: OnProgress,
): Promise<ReportReading> {
  if (inBrowser()) return BROWSER;
  return ask<MemoryReading, ReportReading>(
    "memory_start",
    { game, ...choice, onProgress: progressChannel(onProgress) },
    (reading) => ({ state: "ready", reading }),
  );
}

/** Asks the running watch to end early. */
export async function stopWatch(
  game: string,
  watch: string | null,
): Promise<StepReading> {
  return ask<StepResult, StepReading>(
    "memory_stop",
    { game, watch },
    (result) => ({ state: "ready", result }),
  );
}

/** Puts the owner's words beside a watch's figures, at the moment they began the mark (seconds since 1970). */
export async function markWatch(
  game: string,
  watch: string | null,
  text: string,
  at: number | null,
): Promise<StepReading> {
  return ask<StepResult, StepReading>(
    "memory_mark",
    { game, watch, text, at },
    (result) => ({ state: "ready", result }),
  );
}
