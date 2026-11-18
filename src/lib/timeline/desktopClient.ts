import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
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
  if (inBrowser()) return BROWSER;
  return ask<Timeline, TimelineReading>(
    "timeline",
    { game, onProgress: progressChannel(onProgress) },
    (timeline) => ({ state: "ready", timeline }),
  );
}

/** A changelog as it stood at a commit, or at a moment. The host checks the request. */
export async function readAsItStood(
  game: string,
  request: StoodRequest,
  onProgress?: OnProgress,
): Promise<StoodReading> {
  return ask<AsItStood, StoodReading>(
    "as_it_stood",
    {
      game,
      repository: request.repository,
      changelog: request.changelog,
      commit: request.commit,
      when: request.commit ? null : request.when,
      onProgress: progressChannel(onProgress),
    },
    (found) => ({ state: "ready", found }),
  );
}
