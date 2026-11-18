import { invoke, isTauri } from "@tauri-apps/api/core";
import { progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failure } from "../shell/types";
import type { SetResult, SettingsList, SettingsReading } from "./types";

/** Every setting the tools read, with where each value comes from, read by the host through the kit. */
export async function readSettings(
  onProgress?: OnProgress,
): Promise<SettingsReading> {
  if (!isTauri()) return { state: "browser" };
  try {
    const list = await invoke<SettingsList>("settings_list", {
      onProgress: progressChannel(onProgress),
    });
    return { state: "ready", list };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}

/** Sets one setting in the central file, or clears it with no value. The host checks the request and the kit's manifest. */
export async function saveSetting(
  key: string,
  value: string | null,
  onProgress?: OnProgress,
): Promise<
  { state: "done"; result: SetResult } | { state: "failed"; failure: Failure }
> {
  try {
    const result = await invoke<SetResult>("set_setting", {
      key,
      value,
      onProgress: progressChannel(onProgress),
    });
    return { state: "done", result };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}
