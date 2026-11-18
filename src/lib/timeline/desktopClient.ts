import { invoke, isTauri } from "@tauri-apps/api/core";
import { progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failure } from "../shell/types";
import type {
  AsItStood,
  StoodReading,
  StoodRequest,
  Timeline,
  TimelineReading,
} from "./types";

/** Every fact about a game's products over time, read by the host through the kit. */
export async function readTimeline(
  game: string,
  onProgress?: OnProgress,
): Promise<TimelineReading> {
  if (!isTauri()) return { state: "browser" };
  try {
    const timeline = await invoke<Timeline>("timeline", {
      game,
      onProgress: progressChannel(onProgress),
    });
    return { state: "ready", timeline };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}

/** A changelog as it stood at a commit, or at a moment. The host checks the request. */
export async function readAsItStood(
  game: string,
  request: StoodRequest,
  onProgress?: OnProgress,
): Promise<StoodReading> {
  try {
    const found = await invoke<AsItStood>("as_it_stood", {
      game,
      repository: request.repository,
      changelog: request.changelog,
      commit: request.commit,
      when: request.commit ? null : request.when,
      onProgress: progressChannel(onProgress),
    });
    return { state: "ready", found };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}
