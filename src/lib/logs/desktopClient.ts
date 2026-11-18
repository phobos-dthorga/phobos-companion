import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { LogPageReading, LogReading } from "./types";

/** The game's log, grouped and compared with the run before, by the game's own log reader; the host says when it has none. */
export async function readLog(
  game: string,
  onProgress?: OnProgress,
): Promise<LogPageReading> {
  return ask<LogReading, LogPageReading>(
    "read_log",
    { game, onProgress: progressChannel(onProgress) },
    (reading) => ({ state: "ready", reading }),
  );
}
