import { invoke, isTauri } from "@tauri-apps/api/core";
import { progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failure } from "../shell/types";
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
  if (!isTauri()) return { state: "browser" };
  try {
    const repositories = await invoke<RepositoryInstalls[]>("mod_installs", {
      game,
      onProgress: progressChannel(onProgress),
    });
    return { state: "ready", repositories };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
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
  try {
    const result = await invoke<MoveResult>("move_install", {
      game,
      repository,
      action,
      mods,
      backup,
      onProgress: progressChannel(onProgress),
    });
    return { state: "ready", result };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}

/** Whether any active mod's textures need encoding; "none" for a game the tools have no texture check for. */
export async function readTextures(
  game: string,
  onProgress?: OnProgress,
): Promise<TexturesReading> {
  if (!isTauri()) return { state: "browser" };
  try {
    const status = await invoke<TexturesStatus | null>("texture_status", {
      game,
      onProgress: progressChannel(onProgress),
    });
    return status ? { state: "ready", status } : { state: "none" };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}

/** Asks the host to encode the named mods' textures, once the owner has confirmed. */
export async function encodeTextures(
  game: string,
  mods: string[],
  onProgress?: OnProgress,
): Promise<MoveReading> {
  try {
    const result = await invoke<MoveResult>("encode_textures", {
      game,
      mods,
      onProgress: progressChannel(onProgress),
    });
    return { state: "ready", result };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}
