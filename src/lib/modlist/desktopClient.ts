import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { ModListChange, ModListCheck } from "./types";

type Checked = { state: "ready"; check: ModListCheck };
type Changed = { state: "ready"; result: ModListChange };

/** A game's check. `online` also asks Steam which Workshop items still exist. Only reads. */
export async function readModList(
  game: string,
  online: boolean,
  onProgress?: OnProgress,
): Promise<Checked | Failed> {
  return ask<ModListCheck, Checked>(
    "mod_list_check",
    { game, online, onProgress: progressChannel(onProgress) },
    (check) => ({ state: "ready", check }),
  );
}

/** One change the last check offered; the host checks it was offered and the kit keeps a backup first. */
export async function changeModList(
  game: string,
  list: string,
  action: string,
  id: string,
  onProgress?: OnProgress,
): Promise<Changed | Failed> {
  return ask<ModListChange, Changed>(
    "mod_list_change",
    { game, list, action, id, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "ready", result }),
  );
}

/** Puts a list back as it was before the latest change the tools made to it. */
export async function undoModList(
  game: string,
  list: string,
  onProgress?: OnProgress,
): Promise<Changed | Failed> {
  return ask<ModListChange, Changed>(
    "mod_list_undo",
    { game, list, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "ready", result }),
  );
}

/** Opens a mod's Workshop page in the Steam client; only a number the check named. */
export async function openInSteam(
  number: string,
): Promise<{ state: "ready" } | Failed> {
  return ask<null, { state: "ready" }>(
    "mod_list_open_in_steam",
    { number },
    () => ({ state: "ready" }),
  );
}
