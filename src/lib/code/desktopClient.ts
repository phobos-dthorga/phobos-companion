import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
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

/** Which side of a changed file, and where it is: the code viewer's own request, checked again by the host (0.50.0). */
export type ChangedFileRequest = {
  game: string;
  repository: string;
  /** The commit the viewer shows, or null for changes in no commit yet. */
  commit: string | null;
  path: string;
  side: "before" | "after";
};

/** One side of a file that isn't text, as bytes. The host hands over only a file the viewer's last answer listed. */
export async function readChangedFile(
  request: ChangedFileRequest,
): Promise<{ state: "ready"; bytes: Uint8Array } | Failed> {
  return ask<ArrayBuffer | number[], { state: "ready"; bytes: Uint8Array }>(
    "changed_file",
    { ...request },
    (raw) => ({
      state: "ready",
      bytes:
        raw instanceof ArrayBuffer ? new Uint8Array(raw) : Uint8Array.from(raw),
    }),
  );
}

/** Saves a copy of one side where the person chooses; the path, or null when they closed the dialog. */
export async function saveChangedFile(
  request: ChangedFileRequest,
  title: string,
): Promise<{ state: "ready"; path: string | null } | Failed> {
  return ask<string | null, { state: "ready"; path: string | null }>(
    "save_changed_file",
    { ...request, title },
    (path) => ({ state: "ready", path }),
  );
}

/** Opens a copy of one side with the program the system uses for its kind; the copy's path. */
export async function openChangedFile(
  request: ChangedFileRequest,
): Promise<{ state: "ready"; path: string } | Failed> {
  return ask<string, { state: "ready"; path: string }>(
    "open_changed_file",
    { ...request },
    (path) => ({ state: "ready", path }),
  );
}
