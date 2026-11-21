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
  DailyReading,
  DailyRun,
  ListRef,
  RepositoryCopies,
  SafeCopiesReading,
} from "./types";

/** Every list of safe copies a game's Home shows, read by the host through the kit (0.42.0; the game's own list, 0.44.0). */
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

/** Copy now: the host checks the list and the kit's manifest, then the kit copies what changed and pushes. */
export async function copyNow(
  game: string,
  where: ListRef,
  onProgress?: OnProgress,
): Promise<CopyReading> {
  return ask<CopyResult, CopyReading>(
    "safe_copies_copy",
    {
      game,
      repository: where.repository,
      list: where.list,
      onProgress: progressChannel(onProgress),
    },
    (result) => ({ state: "done", result }),
  );
}

/** Check the copies: hashes every copy again. Only reads. */
export async function checkCopies(
  game: string,
  where: ListRef,
  onProgress?: OnProgress,
): Promise<CopyReading> {
  return ask<CopyResult, CopyReading>(
    "safe_copies_check",
    {
      game,
      repository: where.repository,
      list: where.list,
      onProgress: progressChannel(onProgress),
    },
    (result) => ({ state: "done", result }),
  );
}

/** Restore one set, or one training of it, into a folder the owner picked (0.43.0). The host and the kit both check it first. */
export async function restoreCopies(
  game: string,
  where: ListRef,
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
      repository: where.repository,
      list: where.list,
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
  where: ListRef,
  copy: string,
  onProgress?: OnProgress,
): Promise<CopyReading> {
  return ask<CopyResult, CopyReading>(
    "safe_copies_let_go",
    {
      game,
      repository: where.repository,
      list: where.list,
      copy,
      onProgress: progressChannel(onProgress),
    },
    (result) => ({ state: "done", result }),
  );
}

/** The daily run: whether it is set, when, and how the last went (0.44.0). Only reads. */
export async function readDaily(
  onProgress?: OnProgress,
): Promise<DailyReading> {
  if (inBrowser()) return BROWSER;
  return ask<CopyResult, DailyReading>(
    "safe_copies_daily",
    { onProgress: progressChannel(onProgress) },
    (result) => ({
      state: "ready",
      daily: result.data as unknown as DailyRun,
      refusal: result.ok ? null : result.refusal,
    }),
  );
}

/** Sets the daily run to a time the owner pressed, or turns it off with null (0.44.0). */
export async function setDaily(
  at: string | null,
  onProgress?: OnProgress,
): Promise<DailyReading> {
  return ask<CopyResult, DailyReading>(
    "safe_copies_set_daily",
    { at, onProgress: progressChannel(onProgress) },
    (result) => ({
      state: "ready",
      daily: result.data as unknown as DailyRun,
      refusal: result.ok ? null : result.refusal,
    }),
  );
}
