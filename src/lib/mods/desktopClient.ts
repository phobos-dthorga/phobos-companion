import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
  readKept,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { Ledger } from "./ledger";
import type {
  InstallsReading,
  Move,
  MoveReading,
  MoveResult,
  RepositoryInstalls,
  TexturesReading,
  TexturesStatus,
} from "./types";

/** Every repository of a game that says where its mods are installed, read by the host through the kit. */
export async function readInstalls(
  game: string,
  onProgress?: OnProgress,
  ahead = false,
): Promise<InstallsReading> {
  if (inBrowser()) return BROWSER;
  return ask<RepositoryInstalls[], InstallsReading>(
    "mod_installs",
    { game, ahead, onProgress: progressChannel(onProgress) },
    installsReady,
  );
}

const installsReady = (
  repositories: RepositoryInstalls[],
): InstallsReading => ({ state: "ready", repositories });

/** The mods as last read, with when (0.116.0); null when none were kept. */
export function keptInstalls(game: string) {
  return readKept<RepositoryInstalls[], InstallsReading>(
    "mod_installs",
    [game],
    installsReady,
  );
}

/**
 * A quick look at what the Mods page reads (0.116.0; the owner's choice of 28 Nov 2026, "Only if something changed"): a
 * fingerprint of the repositories and the installed mods' folders, taken without the tools; null before a first read this run.
 */
export async function glanceInstalls(game: string): Promise<string | null> {
  if (inBrowser()) return null;
  const answer = await ask<string | null, string | null>(
    "installs_glance",
    { game },
    (print) => print,
  );
  return typeof answer === "string" ? answer : null;
}

/** Asks the host to make one move. The host and the kit both check it first. */
export async function makeMove(
  game: string,
  repository: string,
  action: Move,
  mods: string[],
  backup: string | null,
  onProgress?: OnProgress,
): Promise<MoveReading> {
  return ask<MoveResult, MoveReading>(
    "move_install",
    {
      game,
      repository,
      action,
      mods,
      backup,
      onProgress: progressChannel(onProgress),
    },
    (result) => ({ state: "ready", result }),
  );
}

/** Whether any active mod's textures need encoding; "none" for a game the tools have no texture check for. */
export async function readTextures(
  game: string,
  onProgress?: OnProgress,
  ahead = false,
): Promise<TexturesReading> {
  if (inBrowser()) return BROWSER;
  return ask<TexturesStatus | null, TexturesReading>(
    "texture_status",
    { game, ahead, onProgress: progressChannel(onProgress) },
    texturesReady,
  );
}

const texturesReady = (status: TexturesStatus | null): TexturesReading =>
  status ? { state: "ready", status } : { state: "none" };

/** The textures as last read (0.116.0); null when none were kept. */
export function keptTextures(game: string) {
  return readKept<TexturesStatus | null, TexturesReading>(
    "texture_status",
    [game],
    texturesReady,
  );
}

/** Asks the host to encode the named mods' textures, once the owner has confirmed. */
export async function encodeTextures(
  game: string,
  mods: string[],
  onProgress?: OnProgress,
): Promise<MoveReading> {
  return ask<MoveResult, MoveReading>(
    "encode_textures",
    { game, mods, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "ready", result }),
  );
}

/** Every setting a game's mods ever added, removed or gave a new default, with the owner's marks; a failure in words. */
export async function readLedger(
  game: string,
  onProgress?: OnProgress,
  ahead = false,
): Promise<{ state: "ready"; ledgers: Ledger[] } | Failed> {
  return ask<Ledger[], { state: "ready"; ledgers: Ledger[] }>(
    "mod_settings",
    { game, ahead, onProgress: progressChannel(onProgress) },
    (ledgers) => ({ state: "ready", ledgers }),
  );
}

/** Every setting ever changed, as last read (0.116.0); null when it was not kept. */
export function keptLedger(game: string) {
  return readKept<Ledger[], { state: "ready"; ledgers: Ledger[] }>(
    "mod_settings",
    [game],
    (ledgers) => ({ state: "ready", ledgers }),
  );
}

/** Marks settings of one repository as looked at, or not; the host checks the ids before it writes. */
export async function markSettings(
  game: string,
  repository: string,
  ids: string[],
  seen: boolean,
): Promise<{ state: "ready"; time: string } | Failed> {
  return ask<string, { state: "ready"; time: string }>(
    "mark_settings",
    { game, repository, ids, seen },
    (time) => ({ state: "ready", time }),
  );
}

/** Whether this game's tools pair each picture with its encoded texture (0.53.0); false in a browser. */
export async function texturePairsOffered(game: string): Promise<boolean> {
  if (inBrowser()) return false;
  const answer = await ask<boolean, { state: "ready"; offered: boolean }>(
    "texture_pairs_offered",
    { game },
    (offered) => ({ state: "ready", offered }),
  );
  return answer.state === "ready" && answer.offered;
}

/** One picture of a mod beside the encoded texture the game loads in its place (phobos-modkit 1.82.0). */
export type TexturePair = {
  picture: string | null;
  encoded: string | null;
  state: "fresh" | "stale" | "missing" | "left-over";
  pictureSize: number | null;
  encodedSize: number | null;
};

export type TexturePairs = {
  name: string;
  folder: string;
  /** The encoded textures are stored upside down, as the game reads them. */
  flipped: boolean;
  counts: Record<TexturePair["state"], number>;
  total: number;
  pairs: TexturePair[];
};

/** One active mod's pictures beside their encoded textures. */
export async function readTexturePairs(
  game: string,
  name: string,
  onProgress?: OnProgress,
): Promise<{ state: "ready"; found: TexturePairs } | Failed> {
  return ask<TexturePairs, { state: "ready"; found: TexturePairs }>(
    "texture_pairs",
    { game, name, onProgress: progressChannel(onProgress) },
    (found) => ({ state: "ready", found }),
  );
}
