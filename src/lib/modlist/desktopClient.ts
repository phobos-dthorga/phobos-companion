import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type {
  EditAnswer,
  ModListChange,
  ModListCheck,
  ModsListing,
  RuleKind,
  RulesListing,
  SortAnswer,
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

/**
 * One change from Edit the list, saved at once: remove (switch off), enable (switch on) or move one mod or several (0.47.0);
 * `place` counts from 1, and several mods go there as one block.
 */
export async function editModList(
  game: string,
  list: string,
  action: "remove" | "enable" | "move",
  ids: string[],
  place: number | null,
  onProgress?: OnProgress,
): Promise<Edited | Failed> {
  return ask<EditAnswer, Edited>(
    "mod_list_edit",
    { game, list, action, ids, place, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "ready", result }),
  );
}

type Sorted = { state: "ready"; result: SortAnswer };
type Ruled = { state: "ready"; listing: RulesListing };

/** A list sorted from every rule, each move explained (0.47.0): `full` rebuilds the order; written only when `apply`. */
export async function sortModList(
  game: string,
  list: string,
  full: boolean,
  apply: boolean,
  onProgress?: OnProgress,
): Promise<Sorted | Failed> {
  return ask<SortAnswer, Sorted>(
    "mod_list_sort",
    { game, list, full, apply, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "ready", result }),
  );
}

/** The owner's load-order rules and every rule set the sorter reads. Only reads. */
export async function readRules(
  game: string,
  onProgress?: OnProgress,
): Promise<Ruled | Failed> {
  return ask<RulesListing, Ruled>(
    "mod_list_rules",
    { game, onProgress: progressChannel(onProgress) },
    (listing) => ({ state: "ready", listing }),
  );
}

/** Keeps one of the owner's rules; `other` is empty for the top or the bottom. */
export async function addRule(
  game: string,
  id: string,
  kind: RuleKind,
  other: string,
): Promise<Changed | Failed> {
  return ask<ModListChange, Changed>(
    "mod_list_add_rule",
    { game, id, kind, other },
    (result) => ({ state: "ready", result }),
  );
}

/** Takes away the owner's rule with this number. */
export async function dropRule(
  game: string,
  number: number,
): Promise<Changed | Failed> {
  return ask<ModListChange, Changed>(
    "mod_list_drop_rule",
    { game, number },
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
