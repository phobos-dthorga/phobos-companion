import { patchTargetsOf, type PatchTarget } from "../connections/patches";
import { readGameFiles } from "../gamefiles/desktopClient";
import { askUpdates } from "../othercode/desktopClient";
import type { KeptFile, KeptFiles } from "../othercode/types";
import { lastChecked } from "./checkedMemory";
import {
  compareFrom,
  notKeptYet,
  patchedSince,
  summarise,
  tiedUpdates,
  type PatchedChange,
  type SinceSummary,
} from "./sinceLastPlayed";

/**
 * What updated since you last played, and which of those changed a method our mods patch: the readings behind Since you last
 * played (0.28.0), kept here since 0.67.0 so the Mods page and the page list's scan ask the same way. They only read.
 */
export type Patches =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "none" }
  | {
      state: "ready";
      patched: PatchedChange[];
      tied: KeptFile[];
      notKept: KeptFile[];
    };

/**
 * What updated since the session before (while the game runs, the launch before this one); null when the game's files could not
 * be read. 0.42.1: an update stays listed until a check has looked at it, so this reaches back to the last check when that is
 * earlier.
 */
export async function readSince(
  game: string,
  running: boolean,
): Promise<SinceSummary | null> {
  const answer = await readGameFiles(game, running ? "previous" : null);
  if (answer.state !== "ready") return null;
  const byLaunch = summarise(answer.files, running);
  const from = compareFrom(byLaunch.since, lastChecked(game), new Date());
  if (from.reach === "launch") return byLaunch;
  const wider = await readGameFiles(game, from.since);
  if (wider.state !== "ready") return byLaunch;
  return {
    ...summarise(wider.files, running),
    sincePrevious: byLaunch.sincePrevious,
    thisLaunchOnly: byLaunch.thisLaunchOnly,
    reach: from.reach,
  };
}

/** Which updates are mods ours tie into, which changed what ours patch, and which are not kept yet to compare. */
export async function readPatches(
  game: string,
  repositories: string[],
  summary: SinceSummary,
): Promise<Patches> {
  if (summary.updated.length === 0 && !summary.gameUpdated)
    return { state: "idle" };
  const listed = await askUpdates<KeptFiles>(game, null, null, null);
  const kept =
    listed.state === "ready" && listed.answer.available
      ? (listed.answer.data?.files ?? [])
      : [];
  const tied = tiedUpdates(kept, summary);
  if (tied.length === 0) return { state: "none" };
  const targets: PatchTarget[] = [];
  for (const repository of repositories) {
    const found = await patchTargetsOf(game, repository);
    targets.push(...(found.data?.targets ?? []));
  }
  return {
    state: "ready",
    patched: patchedSince(targets, summary),
    tied,
    notKept: notKeptYet(tied, summary.since),
  };
}
