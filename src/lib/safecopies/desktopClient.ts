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

/** Restore one set, or one training of it, into a folder the owner picked (0.43.0). The host and the kit both check it first. */
export async function restoreCopies(
  game: string,
  repository: string,
  set: string,
  unit: string | null,
  to: string,
  overwrite: boolean,
  onProgress?: OnProgress,
): Promise<CopyReading> {
  return ask<CopyResult, CopyReading>(
    "safe_copies_restore",
    {
      game,
      repository,
      set,
      unit,
      to,
      overwrite,
      onProgress: progressChannel(onProgress),
    },
    (result) => ({ state: "done", result }),
  );
}

/** Let go of one copy the tools list as no longer taken (0.43.0). The kit refuses any copy still taken. */
export async function letGoCopy(
  game: string,
  repository: string,
  copy: string,
  onProgress?: OnProgress,
): Promise<CopyReading> {
  return ask<CopyResult, CopyReading>(
    "safe_copies_let_go",
    { game, repository, copy, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "done", result }),
  );
}
