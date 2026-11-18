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
