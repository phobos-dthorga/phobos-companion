import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type {
  CopyReading,
  CopyResult,
  RepositoryCopies,
  SafeCopiesReading,
} from "./types";

/** Each of a game's repositories that lists safe copies, read by the host through the kit (0.42.0). Only reads. */
export async function readSafeCopies(
  game: string,
  onProgress?: OnProgress,
): Promise<SafeCopiesReading> {
  if (inBrowser()) return BROWSER;
  return ask<RepositoryCopies[], SafeCopiesReading>(
    "safe_copies_status",
    { game, onProgress: progressChannel(onProgress) },
    (repositories) => ({ state: "ready", repositories }),
  );
}

/** Copy now: the host checks the repository and the kit's manifest, then the kit copies what changed and pushes. */
export async function copyNow(
  game: string,
  repository: string,
  onProgress?: OnProgress,
): Promise<CopyReading> {
  return ask<CopyResult, CopyReading>(
    "safe_copies_copy",
    { game, repository, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "done", result }),
  );
}

/** Check the copies: hashes every copy again. Only reads. */
export async function checkCopies(
  game: string,
  repository: string,
  onProgress?: OnProgress,
): Promise<CopyReading> {
  return ask<CopyResult, CopyReading>(
    "safe_copies_check",
    { game, repository, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "done", result }),
  );
}
