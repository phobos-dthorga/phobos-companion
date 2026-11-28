import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { AskKind, Reading, SaveReading } from "./types";

/**
 * Reads what the Save explorer asks of a save (the newest when none is named): a level of its parts under a place, a search, or
 * one thing by its ID. The host checks every word first.
 */
export async function readSave(
  game: string,
  save: string | null,
  kind: AskKind,
  text: string | null,
  onProgress?: OnProgress,
): Promise<Reading> {
  if (inBrowser()) return BROWSER;
  return ask<SaveReading, Reading>(
    "save_explorer_read",
    { game, save, kind, text, onProgress: progressChannel(onProgress) },
    (reading) => ({ state: "ready", reading }),
  );
}
