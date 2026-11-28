import { Channel } from "@tauri-apps/api/core";
import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type {
  CostsData,
  GameRecorded,
  ListReading,
  LookKind,
  PerformanceReading,
  RecordChoice,
  ReportReading,
  Summary,
} from "./types";

/** Every recording kept for the game, newest first, with its summary; the host says when the game's tools have none. */
export async function readList(
  game: string,
  onProgress?: OnProgress,
): Promise<ListReading> {
  if (inBrowser()) return BROWSER;
  return ask<PerformanceReading, ListReading>(
    "performance_list",
    { game, onProgress: progressChannel(onProgress) },
    (reading) => ({
      state: "ready",
      reading,
      recordings: (reading.data?.recordings as Summary[] | undefined) ?? [],
    }),
  );
}

/** What each mod costs by the newest recording, and the busiest methods (0.119.0); null when the game's tools have none. */
export async function readCosts(
  game: string,
): Promise<{ state: "ready"; costs: CostsData | null } | Failed> {
  if (inBrowser()) return { state: "ready", costs: null };
  return ask<
    PerformanceReading,
    { state: "ready"; costs: CostsData | null } | Failed
  >(
    "performance_costs",
    { game, onProgress: progressChannel(undefined) },
    (reading) => ({
      state: "ready",
      costs: reading.available ? (reading.data as CostsData | null) : null,
    }),
  );
}

/** One recording's whole report. */
export async function readRecording(
  game: string,
  recording: string,
  onProgress?: OnProgress,
): Promise<ReportReading> {
  if (inBrowser()) return BROWSER;
  return ask<PerformanceReading, ReportReading>(
    "performance_report",
    { game, recording, onProgress: progressChannel(onProgress) },
    (reading) => ({ state: "ready", reading }),
  );
}

/** A closer look at a recording: callers of a method, one mod, a comparison with another recording, or our own mods' trend. */
export async function readLook(
  game: string,
  recording: string,
  kind: LookKind,
  text: string | null,
  onProgress?: OnProgress,
): Promise<ReportReading> {
  if (inBrowser()) return BROWSER;
  return ask<PerformanceReading, ReportReading>(
    "performance_look",
    { game, recording, kind, text, onProgress: progressChannel(onProgress) },
    (reading) => ({ state: "ready", reading }),
  );
}

/** Records the running game on the owner's press and yes; answers when it ends, with its report. */
export async function recordGame(
  game: string,
  choice: RecordChoice,
  onProgress?: OnProgress,
): Promise<ReportReading> {
  if (inBrowser()) return BROWSER;
  return ask<PerformanceReading, ReportReading>(
    "performance_record",
    { game, ...choice, onProgress: progressChannel(onProgress) },
    (reading) => ({ state: "ready", reading }),
  );
}

/** Takes the key that records the game from inside it (0.118.0); each press is told to `onRecorded`, as it starts and ends. */
export async function takeRecordKey(
  game: string,
  key: string,
  onRecorded: (recorded: GameRecorded) => void,
): Promise<{ state: "ready" } | Failed> {
  if (inBrowser()) return { state: "ready" };
  const channel = new Channel<GameRecorded>();
  channel.onmessage = onRecorded;
  return ask<null, { state: "ready" } | Failed>(
    "performance_take_game_key",
    { game, key, onRecorded: channel },
    () => ({ state: "ready" }),
  );
}

/** Lets go of that key. */
export async function releaseRecordKey(): Promise<void> {
  if (inBrowser()) return;
  await ask<null, { state: "ready" } | Failed>(
    "performance_release_game_key",
    {},
    () => ({ state: "ready" }),
  );
}
