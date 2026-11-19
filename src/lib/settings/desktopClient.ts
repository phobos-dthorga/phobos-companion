import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { SetResult, SettingsList, SettingsReading } from "./types";

/** Every setting the tools read, with where each value comes from, read by the host through the kit. */
export async function readSettings(
  onProgress?: OnProgress,
): Promise<SettingsReading> {
  if (inBrowser()) return BROWSER;
  return ask<SettingsList, SettingsReading>(
    "settings_list",
    { onProgress: progressChannel(onProgress) },
    (list) => ({ state: "ready", list }),
  );
}

/**
 * Opens Windows' own folder or file picker where the current value is, and answers with the path chosen, or closed when the owner
 * closed it without choosing (0.29.0). Saving it is the caller's, through `saveSetting`, as a typed path is.
 */
export async function pickPath(
  kind: "folder" | "file",
  title: string,
  current: string | null,
): Promise<{ state: "picked"; path: string } | { state: "closed" } | Failed> {
  return ask<
    string | null,
    { state: "picked"; path: string } | { state: "closed" }
  >("pick_path", { kind, title, current }, (path) =>
    path ? { state: "picked", path } : { state: "closed" },
  );
}

/** Sets one setting in the central file, or clears it with no value. The host checks the request and the kit's manifest. */
export async function saveSetting(
  key: string,
  value: string | null,
  onProgress?: OnProgress,
): Promise<{ state: "done"; result: SetResult } | Failed> {
  return ask<SetResult, { state: "done"; result: SetResult }>(
    "set_setting",
    { key, value, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "done", result }),
  );
}
