import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Failure } from "../shell/types";
import type { Home, HomeReading } from "./types";

/** Asks the host where each game was left. */
export async function readHome(): Promise<HomeReading> {
  if (!isTauri()) return { state: "browser" };
  try {
    return { state: "ready", home: await invoke<Home>("home_status") };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}
