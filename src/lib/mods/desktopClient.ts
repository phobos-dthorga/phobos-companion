import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
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
