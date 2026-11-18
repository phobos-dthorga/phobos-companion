import { invoke, isTauri } from "@tauri-apps/api/core";
import { progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failure } from "../shell/types";
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
  if (!isTauri()) return { state: "browser" };
  try {
    const repositories = await invoke<RepositoryChanges[]>("changes_list", {
      game,
      onProgress: progressChannel(onProgress),
    });
    return { state: "ready", repositories };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}

/** The code behind one changelog entry: the commit that wrote it, and what that commit changed. The host checks the request. */
export async function readEntryCode(
  game: string,
  request: EntryRequest,
  onProgress?: OnProgress,
): Promise<EntryCodeReading> {
  try {
    const found = await invoke<EntryCode>("entry_code", {
      game,
      repository: request.repository,
      changelog: request.changelog,
      text: request.entry.text,
      onProgress: progressChannel(onProgress),
    });
    return { state: "ready", found };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}
