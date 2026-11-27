import { readPatchTargets } from "./desktopClient";

/** A method a repository's code patches (kit 1.37.0 `targets`): its other patchers and what the last update changed in it. */
export type PatchTarget = {
  /** The method's connections id, such as cs:Verse.Pawn.Tick. */
  node: string;
  target: string;
  name: string;
  assembly: string | null;
  /** The repository's patch methods on it, by connections id. */
  ours: string[];
  /** Every other active mod patching it, by name. */
  mods: string[];
  /** How many of their patches are prefixes that may skip the original. */
  skippers: number;
  changed: {
    mod: string;
    file: string;
    versions: string;
    change: string;
    /** When the tools first kept the newer build, as an ISO time (phobos-modkit 1.51.0). */
    newestKept?: string;
  }[];
};

export type PatchTargets = {
  available: boolean;
  data: {
    targets: PatchTarget[];
    updates: boolean;
    updatesNote: string | null;
  } | null;
};

/** How many other mods on one method make it worth a mark (agent's choice, owner to change). */
export const CROWDED = 3;

/** The targets a thing is part of: as the method patched, as one of our patches, or as the type holding our patches. */
export function targetsAbout(
  targets: PatchTarget[],
  id: string,
): PatchTarget[] {
  return targets.filter(
    (t) =>
      t.node === id ||
      t.ours.includes(id) ||
      t.ours.some((own) => own.startsWith(`${id}.`)),
  );
}

/** Whether a target is worth a mark: crowded, or changed by the last update. */
export function isRisky(target: PatchTarget): boolean {
  return target.changed.length > 0 || target.mods.length >= CROWDED;
}

/** Every node to mark in a picture: risky targets and our patches on them. */
export function riskyNodes(targets: PatchTarget[]): Set<string> {
  const marked = new Set<string>();
  for (const target of targets.filter(isRisky)) {
    marked.add(target.node);
    for (const own of target.ours) marked.add(own);
  }
  return marked;
}

/** Read once a window, by game and repository: the tools take a few seconds, and a picture re-centres often. */
const read = new Map<string, Promise<PatchTargets>>();

/** Forgets a repository's patch targets, so the next ask reads them again (after new builds were kept, 0.28.0). */
export function forgetPatchTargets(game: string, repository: string): void {
  read.delete(`${game}/${repository}`);
}

export function patchTargetsOf(
  game: string,
  repository: string,
  ahead = false,
): Promise<PatchTargets> {
  const key = `${game}/${repository}`;
  if (!read.has(key))
    read.set(
      key,
      readPatchTargets(game, repository, ahead).then((answer) =>
        "available" in answer ? answer : { available: false, data: null },
      ),
    );
  return read.get(key)!;
}
