import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type {
  EditAnswer,
  ModListChange,
  ModListCheck,
  ModsListing,
} from "./types";

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

type Listed = { state: "ready"; listing: ModsListing };
type Edited = { state: "ready"; result: EditAnswer };

/** Every mod on this PC and each list in order, for Edit the list. Only reads. */
export async function readMods(
  game: string,
  onProgress?: OnProgress,
): Promise<Listed | Failed> {
  return ask<ModsListing, Listed>(
    "mod_list_mods",
    { game, onProgress: progressChannel(onProgress) },
    (listing) => ({ state: "ready", listing }),
  );
}

/** One change from Edit the list, saved at once: remove (switch off), enable (switch on) or move; `place` counts from 1. */
export async function editModList(
  game: string,
  list: string,
  action: "remove" | "enable" | "move",
  id: string,
  place: number | null,
  onProgress?: OnProgress,
): Promise<Edited | Failed> {
  return ask<EditAnswer, Edited>(
    "mod_list_edit",
    { game, list, action, id, place, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "ready", result }),
  );
}

/** Undo from Edit the list: goes back on the latest change, and answers with the list as it now stands. */
export async function undoEdit(
  game: string,
  list: string,
  onProgress?: OnProgress,
): Promise<Edited | Failed> {
  return ask<EditAnswer, Edited>(
    "mod_list_undo",
    { game, list, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "ready", result }),
  );
}
