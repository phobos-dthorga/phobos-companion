import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Failure } from "../shell/types";
import type {
  InstallsReading,
  Move,
  MoveReading,
  MoveResult,
  RepositoryInstalls,
} from "./types";

/** Every repository of a game that says where its mods are installed, read by the host through the kit. */
export async function readInstalls(game: string): Promise<InstallsReading> {
  if (!isTauri()) return { state: "browser" };
  try {
    const repositories = await invoke<RepositoryInstalls[]>("mod_installs", {
      game,
    });
    return { state: "ready", repositories };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}

/** Asks the host to make one move the owner confirmed. The host and the kit both check it first. */
export async function makeMove(
  game: string,
  repository: string,
  action: Move,
  modName: string,
  backup: string | null,
): Promise<MoveReading> {
  try {
    const result = await invoke<MoveResult>("move_install", {
      game,
      repository,
      action,
      modName,
      backup,
    });
    return { state: "ready", result };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}
