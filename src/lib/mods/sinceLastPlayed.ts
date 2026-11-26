import type { PatchTarget } from "../connections/patches";
import type { GameFiles } from "../gamefiles/types";
import type { KeptFile } from "../othercode/types";

/**
 * Since you last played (0.28.0), on the Mods page's Before you play: what updated since the session before, which of those are
 * mods ours tie into, which changed a method ours patch, and which have new builds the tools have not kept yet to compare.
 */

/** The game's own file, whose updates come with the game's. */
export const GAME_FILE = "Assembly-CSharp.dll";

export type SinceSummary = {
  /** The moment compared with, as an ISO time. */
  since: string;
  /** While the game runs: compared with the launch before this one. */
  sincePrevious: boolean;
  /** While the game runs and no earlier launch has been seen yet: this launch is all there is to compare with. */
  thisLaunchOnly: boolean;
  gameUpdated: boolean;
  /** The updated Workshop items, by title (or id), newest first. */
  updated: string[];
  /**
   * How far back it reaches (0.42.1): the last launch; the last check, when that is earlier; or, with no check yet, a week before
   * now, when that is earlier. An update stays listed until Check what they mean for ours has looked at it.
   */
  reach: Reach;
};

export type Reach = "launch" | "check" | "week";

export function summarise(files: GameFiles, running: boolean): SinceSummary {
  const changed = files.changed;
  return {
    since: changed.since,
    sincePrevious: changed.sincePrevious === true,
    thisLaunchOnly: running && changed.sincePrevious !== true,
    gameUpdated: changed.gameUpdated,
    updated: changed.workshop.map((item) => item.title ?? item.id),
    reach: "launch",
  };
}

/** With no check made yet, how far back the comparison reaches (agent default, 0.42.1). */
export const FIRST_REACH_DAYS = 7;
const DAY_MS = 86_400_000;

/** A moment the kit's `--since` reads on every Python it supports: whole seconds, and "+00:00" rather than "Z". */
export function kitMoment(ms: number): string {
  return new Date(Math.floor(ms / 1000) * 1000)
    .toISOString()
    .replace(".000Z", "+00:00");
}

/**
 * The moment to compare with (0.42.1; the owner, 21 Nov 2026: an update seen in the morning was gone by the afternoon, once the
 * game had been launched again): the earlier of the launch the game's files name and the last check. With no check yet, a week
 * before now stands in for it. The launch wins when it is the earlier, as before.
 */
export function compareFrom(
  launch: string,
  checked: string | null,
  now: Date,
): { since: string; reach: Reach } {
  const checkedMs = checked ? Date.parse(checked) : NaN;
  const known = Number.isFinite(checkedMs);
  const floor = known ? checkedMs : now.getTime() - FIRST_REACH_DAYS * DAY_MS;
  const launchMs = Date.parse(launch);
  if (Number.isFinite(launchMs) && launchMs <= floor) {
    return { since: launch, reach: "launch" };
  }
  return { since: kitMoment(floor), reach: known ? "check" : "week" };
}

function same(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** The archive's "2026-11-19 09:08 UTC" as milliseconds; null when it cannot be read. */
export function keptTime(text: string | null | undefined): number | null {
  const found = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) UTC$/.exec(text ?? "");
  return found ? Date.parse(`${found[1]}T${found[2]}:00Z`) : null;
}

/** The updated mods the tools keep builds of: the mods ours tie into, by the archive's names; the game too when it updated. */
export function tiedUpdates(
  kept: KeptFile[],
  summary: SinceSummary,
): KeptFile[] {
  return kept.filter(
    (file) =>
      summary.updated.some((title) => same(title, file.owner_name)) ||
      (summary.gameUpdated && file.file === GAME_FILE),
  );
}

/** Of the tied updates, those whose newest kept build is older than the moment compared with: not kept yet, so not compared. */
export function notKeptYet(tied: KeptFile[], since: string): KeptFile[] {
  const line = Date.parse(since);
  return tied.filter((file) => {
    const kept = keptTime(file.newest_seen);
    return kept === null || kept < line;
  });
}

export type PatchedChange = { mod: string; file: string; methods: string[] };

/** The changes to methods ours patch made by a build kept since the moment compared with, by file, from a tied update. */
export function patchedSince(
  targets: PatchTarget[],
  summary: SinceSummary,
): PatchedChange[] {
  const line = Date.parse(summary.since);
  const found = new Map<string, PatchedChange>();
  for (const target of targets) {
    for (const change of target.changed) {
      const kept = change.newestKept ? Date.parse(change.newestKept) : NaN;
      const fromUpdate =
        summary.updated.some((title) => same(title, change.mod)) ||
        (summary.gameUpdated && change.file === GAME_FILE);
      if (!(kept >= line) || !fromUpdate) continue;
      const entry = found.get(change.file) ?? {
        mod: change.mod,
        file: change.file,
        methods: [],
      };
      if (!entry.methods.includes(target.name)) entry.methods.push(target.name);
      found.set(change.file, entry);
    }
  }
  return [...found.values()];
}

/**
 * The check after an update (0.35.0; phobos-modkit 1.61.1's `rimworld-update-check`, the owner's choice of 20 Nov 2026: all four
 * parts), run on the owner's press because it may decompile new builds: whether our patches' targets still exist, whether an update
 * touched a temporary patch's fault, how big each update was, and whether our XML patches still find their Defs.
 */
export type NamesPart = {
  found: number;
  failing: { where: string; target: string; status: string; detail: string }[];
  notChecked: number;
  atRunTime: number;
};
export type TemporaryRow = {
  row: number | string;
  patch: string;
  mod: string;
  file: string;
  status: "changed" | "removed" | "unchanged" | "no-update" | "one-build";
  detail: string;
};
export type UpdateRow = {
  mod: string;
  file: string;
  added: number;
  removed: number;
  signatures: number;
  bodies: number;
  newTypes: string[];
  newTypeCount: number;
};
export type XmlRow = {
  mod: string;
  file: string;
  def: string;
  status: "missing" | "node-missing" | "patched" | "made" | "found";
  detail: string;
};
export type UpdateCheck = {
  since: string;
  names?: NamesPart;
  temporary?: TemporaryRow[];
  updates?: UpdateRow[];
  xml?: { checked: number; rows: XmlRow[]; patchedDefs?: string };
};

/** One problem the XML check found, however many of our patch operations in one file meet it (0.100.1): `key` is unique. */
export type XmlProblem = XmlRow & { key: string; count: number };

export type CheckSummary = {
  names: { found: number; failing: NamesPart["failing"] } | null;
  temporary: { touched: TemporaryRow[]; total: number } | null;
  updates: { shown: UpdateRow[]; more: number } | null;
  xml: { checked: number; problems: XmlProblem[]; patched: number } | null;
};

/** The XML rows that find nothing, identical ones as one row with a count. The check gives a row per patch operation, so a file
 *  with three operations naming one missing Def gave three identical rows; listed by file and Def, they froze the page (the
 *  owner's screen note of 26 Nov 2026, 0.100.1). */
export function xmlProblems(rows: XmlRow[]): XmlProblem[] {
  const found = new Map<string, XmlProblem>();
  for (const row of rows) {
    if (row.status !== "missing" && row.status !== "node-missing") continue;
    const key = JSON.stringify([
      row.mod,
      row.file,
      row.def,
      row.status,
      row.detail,
    ]);
    const seen = found.get(key);
    if (seen) seen.count += 1;
    else found.set(key, { ...row, key, count: 1 });
  }
  return [...found.values()];
}

/** How much an update changed: every declaration added, removed or changed. */
export function updateSize(row: UpdateRow): number {
  return row.added + row.removed + row.signatures + row.bodies;
}

/** What the window shows of a check: the touched temporary patches, the updates that changed code (largest first, `shown` of
 *  them), and our XML patches that find nothing even once every patch has run. */
export function summariseCheck(data: UpdateCheck, shown = 5): CheckSummary {
  const changed = (data.updates ?? []).filter((row) => updateSize(row) > 0);
  const rows = data.xml?.rows ?? [];
  return {
    names: data.names
      ? { found: data.names.found, failing: data.names.failing }
      : null,
    temporary: data.temporary
      ? {
          touched: data.temporary.filter(
            (row) => row.status === "changed" || row.status === "removed",
          ),
          total: data.temporary.length,
        }
      : null,
    updates: data.updates
      ? {
          shown: changed.slice(0, shown),
          more: Math.max(0, changed.length - shown),
        }
      : null,
    xml: data.xml
      ? {
          checked: data.xml.checked,
          problems: xmlProblems(rows),
          patched: rows.filter((row) => row.status === "patched").length,
        }
      : null,
  };
}

/** An update's new types as words: the first few, and how many more. */
export function newTypes(row: UpdateRow): string {
  const more = row.newTypeCount - row.newTypes.length;
  return row.newTypes.join(", ") + (more > 0 ? ` +${more}` : "");
}
