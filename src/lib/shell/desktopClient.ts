import { invoke, isTauri } from "@tauri-apps/api/core";
import type { KitFailure, KitReading, KitStatus } from "./types";

/** Asks the host how the tools are. The only place the window talks to the host about them. */
export async function readKit(): Promise<KitReading> {
  if (!isTauri()) return { state: "browser" };
  try {
    return { state: "ready", status: await invoke<KitStatus>("kit_status") };
  } catch (failure) {
    return { state: "failed", failure: failure as KitFailure };
  }
}
