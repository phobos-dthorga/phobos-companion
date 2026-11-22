import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
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
): Promise<InstallsReading> {
  if (inBrowser()) return BROWSER;
  return ask<RepositoryInstalls[], InstallsReading>(
    "mod_installs",
    { game, onProgress: progressChannel(onProgress) },
    (repositories) => ({ state: "ready", repositories }),
  );
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
): Promise<TexturesReading> {
  if (inBrowser()) return BROWSER;
  return ask<TexturesStatus | null, TexturesReading>(
    "texture_status",
    { game, onProgress: progressChannel(onProgress) },
    (status) => (status ? { state: "ready", status } : { state: "none" }),
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
): Promise<{ state: "ready"; ledgers: Ledger[] } | Failed> {
  return ask<Ledger[], { state: "ready"; ledgers: Ledger[] }>(
    "mod_settings",
    { game, onProgress: progressChannel(onProgress) },
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
