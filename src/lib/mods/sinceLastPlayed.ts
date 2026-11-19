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
};

export function summarise(files: GameFiles, running: boolean): SinceSummary {
  const changed = files.changed;
  return {
    since: changed.since,
    sincePrevious: changed.sincePrevious === true,
    thisLaunchOnly: running && changed.sincePrevious !== true,
    gameUpdated: changed.gameUpdated,
    updated: changed.workshop.map((item) => item.title ?? item.id),
  };
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
