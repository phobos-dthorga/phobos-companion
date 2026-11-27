import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type {
  CompareAnswer,
  SubscribeAnswer,
  UnsubscribeAnswer,
  EditAnswer,
  ListsListing,
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

/** Save on the rebuilt Edit the list (0.108.0): the whole draft at once, with the list it began from; the tools keep a backup. */
export async function writeModList(
  game: string,
  list: string,
  ids: string[],
  was: string[],
  onProgress?: OnProgress,
): Promise<Edited | Failed> {
  return ask<EditAnswer, Edited>(
    "mod_list_write",
    { game, list, ids, was, onProgress: progressChannel(onProgress) },
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

type Lists = { state: "ready"; listing: ListsListing };
type Compared = { state: "ready"; result: CompareAnswer };

/** Every saved list on offer, by source (0.48.0). Only reads. */
export async function readLists(
  game: string,
  onProgress?: OnProgress,
): Promise<Lists | Failed> {
  return ask<ListsListing, Lists>(
    "mod_list_lists",
    { game, onProgress: progressChannel(onProgress) },
    (listing) => ({ state: "ready", listing }),
  );
}

/** What loading a list would change; with `apply`, loads it after a backup. `source` "file" names a file chosen in Open a file. */
export async function compareList(
  game: string,
  list: string,
  source: string,
  reference: string,
  apply: boolean,
  onProgress?: OnProgress,
): Promise<Compared | Failed> {
  return ask<CompareAnswer, Compared>(
    "mod_list_compare",
    {
      game,
      list,
      source,
      reference,
      apply,
      onProgress: progressChannel(onProgress),
    },
    (result) => ({ state: "ready", result }),
  );
}

/** The Open dialog for a list file; the path chosen, or null when it was closed. */
export async function openListFile(
  game: string,
  title: string,
): Promise<{ state: "ready"; path: string | null } | Failed> {
  return ask<string | null, { state: "ready"; path: string | null }>(
    "mod_list_open_file",
    { game, title },
    (path) => ({ state: "ready", path }),
  );
}

/** Keeps the game's list as it stands, by name; `replace` replaces a list kept by that name. */
export async function saveList(
  game: string,
  list: string,
  name: string,
  replace: boolean,
): Promise<Changed | Failed> {
  return ask<ModListChange, Changed>(
    "mod_list_save",
    { game, list, name, replace },
    (result) => ({ state: "ready", result }),
  );
}

/** Takes away a list saved by name. */
export async function forgetList(
  game: string,
  reference: string,
): Promise<Changed | Failed> {
  return ask<ModListChange, Changed>(
    "mod_list_forget",
    { game, reference },
    (result) => ({ state: "ready", result }),
  );
}

/** Writes a list (the game's own when `source` is null) as the game's own list file, where the Save dialog says; null when closed. */
export async function exportList(
  game: string,
  list: string,
  source: string | null,
  reference: string | null,
  label: string,
  title: string,
): Promise<{ state: "ready"; result: ModListChange | null } | Failed> {
  return ask<
    ModListChange | null,
    { state: "ready"; result: ModListChange | null }
  >(
    "mod_list_export",
    { game, list, source, reference, label, title },
    (result) => ({ state: "ready", result }),
  );
}

/** Opens the Steam client's Workshop search for a missing mod's name. */
export async function findOnWorkshop(
  game: string,
  name: string,
): Promise<{ state: "ready" } | Failed> {
  return ask<null, { state: "ready" }>(
    "mod_list_find_on_workshop",
    { game, name },
    () => ({ state: "ready" }),
  );
}

/**
 * Subscribes to Workshop items through the running Steam client (0.49.0); with `wait`, answers once Steam has downloaded them,
 * saying how far it is meanwhile.
 */
export async function subscribeTo(
  game: string,
  numbers: string[],
  wait: boolean,
  onProgress?: OnProgress,
): Promise<{ state: "ready"; result: SubscribeAnswer } | Failed> {
  return ask<SubscribeAnswer, { state: "ready"; result: SubscribeAnswer }>(
    "mod_list_subscribe",
    { game, numbers, wait, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "ready", result }),
  );
}

/** Switches Workshop mods off, then unsubscribes through Steam; only after the owner's yes. */
export async function unsubscribeFrom(
  game: string,
  list: string,
  numbers: string[],
  onProgress?: OnProgress,
): Promise<{ state: "ready"; result: UnsubscribeAnswer } | Failed> {
  return ask<UnsubscribeAnswer, { state: "ready"; result: UnsubscribeAnswer }>(
    "mod_list_unsubscribe",
    { game, list, numbers, onProgress: progressChannel(onProgress) },
    (result) => ({ state: "ready", result }),
  );
}

/** What players say about a mod on its Workshop page (0.107.0): only a number this run named, only while Workshop pages is on. */
export async function playersSay(
  number: string,
  onProgress?: OnProgress,
): Promise<
  | {
      state: "ready";
      answer: import("../othercode/types").OtherAnswer<unknown>;
    }
  | Failed
> {
  return ask<
    import("../othercode/types").OtherAnswer<unknown>,
    {
      state: "ready";
      answer: import("../othercode/types").OtherAnswer<unknown>;
    }
  >(
    "players_say",
    { number, onProgress: progressChannel(onProgress) },
    (answer) => ({ state: "ready", answer }),
  );
}
