import type {
  PendingRow,
  PublishingRepository,
  StatusRow,
  Visibility,
} from "./types";

/**
 * Each mod's card on the Publish page (0.69.0): where it stands on Steam and its one next step, from the kit's `status` and
 * `pending`, in publication order (dependencies first).
 */

/** The one next step a card offers. */
export type NextStep =
  /** The package is not ready: the kit says why. */
  | "fix"
  /** Something blocks it (a hold, a missing cover, a dependency not on Steam yet). */
  | "blocked"
  /** Not on Steam yet: prepare, then upload privately. */
  | "create"
  /** On Steam with an older version: prepare, then send the update. */
  | "update"
  /** On Steam, up to date, not public yet: after your subscription test, make it public. */
  | "public"
  /** Nothing to do. */
  | "done";

export type ModCard = {
  mod: string;
  version: string | null;
  itemId: string | null;
  uploadedVersion: string | null;
  visibility: Visibility | null;
  due: boolean;
  blockers: string[];
  error: string | null;
  requires: string[];
  step: NextStep;
};

/** The step a mod is at. A hold blocks everything but a private test, which the mod view still offers. */
export function nextStep(
  row: StatusRow,
  pending: PendingRow | undefined,
): NextStep {
  if (row.package !== "ready" || row.error) return "fix";
  if (!row.itemId) return row.blockers.length > 0 ? "blocked" : "create";
  if (pending?.needsUpload)
    return row.blockers.length > 0 ? "blocked" : "update";
  if (pending?.uploadedVisibility !== "public") return "public";
  return "done";
}

/** Every mod of a repository as a card, in the kit's order (dependencies first). */
export function cardsOf(repository: PublishingRepository): ModCard[] {
  if (repository.failure !== undefined) return [];
  const pending = new Map(repository.pending.mods.map((row) => [row.mod, row]));
  return repository.status.mods.map((row) => {
    const waiting = pending.get(row.mod);
    return {
      mod: row.mod,
      version: row.version ?? waiting?.version ?? null,
      itemId: row.itemId,
      uploadedVersion: waiting?.uploadedVersion ?? null,
      visibility: waiting?.uploadedVisibility ?? null,
      due: waiting?.needsUpload ?? false,
      blockers: row.blockers,
      error: row.error ?? null,
      requires: row.requires,
      step: nextStep(row, waiting),
    };
  });
}

/** How many items of a repository have a newer version than the one on Steam. */
export function waitingCount(repository: PublishingRepository): number {
  return repository.failure !== undefined
    ? 0
    : repository.pending.mods.filter((row) => row.needsUpload).length;
}

/** The step's words, as a message key. */
export const STEP_WORDS: Record<NextStep, string> = {
  fix: "publish-step-fix",
  blocked: "publish-step-blocked",
  create: "publish-step-create",
  update: "publish-step-update",
  public: "publish-step-public",
  done: "publish-step-done",
};

/** A visibility's words, as a message key. */
export const VISIBILITY_WORDS: Record<Visibility, string> = {
  private: "publish-visibility-private",
  friends: "publish-visibility-friends",
  unlisted: "publish-visibility-unlisted",
  public: "publish-visibility-public",
};

/** The one after (or before) an index in a list, wrapping round; the first when nothing is chosen. */
export function stepped<T>(list: T[], at: number, step: 1 | -1): T | undefined {
  if (list.length === 0) return undefined;
  if (at < 0) return list[0];
  return list[(at + step + list.length) % list.length];
}
