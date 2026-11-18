import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type {
  ChangesReading,
  EntryCode,
  EntryCodeReading,
  EntryRequest,
  RepositoryChanges,
} from "./types";

/** What each of a game's repositories' changelogs say changed lately, read by the host through the kit. */
export async function readChanges(
  game: string,
  onProgress?: OnProgress,
): Promise<ChangesReading> {
  if (inBrowser()) return BROWSER;
  return ask<RepositoryChanges[], ChangesReading>(
    "changes_list",
    { game, onProgress: progressChannel(onProgress) },
    (repositories) => ({ state: "ready", repositories }),
  );
}

/** The code behind one changelog entry, or one commit: what it changed. The host checks the request. */
export async function readEntryCode(
  game: string,
  request: EntryRequest,
  onProgress?: OnProgress,
): Promise<EntryCodeReading> {
  return ask<EntryCode, EntryCodeReading>(
    "entry_code",
    {
      game,
      repository: request.repository,
      changelog: request.changelog,
      text: request.entry.text,
      commit: request.commit ?? null,
      onProgress: progressChannel(onProgress),
    },
    (found) => ({ state: "ready", found }),
  );
}
