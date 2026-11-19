import type { CleanupGroup, CleanupListing } from "./types";

/** The groups left out unless the owner chooses them: install backups are the Mods page's way back (agent's default, 0.27.0). */
export const KEPT_UNLESS_CHOSEN = ["Install backups"];

/** The git file-watcher daemons, a group of their own when chosen (phobos-modkit 1.50.0). */
export const DAEMONS = "Git file-watcher daemons";

/** How much the tools could clear before Home mentions it: 5 GB (agent's choice, 0.27.0). */
export const NUDGE_BYTES = 5 * 1024 ** 3;

/** The groups chosen at first: every one but those kept unless chosen. */
export function firstChoice(groups: CleanupGroup[]): string[] {
  return groups
    .map((g) => g.group)
    .filter((g) => !KEPT_UNLESS_CHOSEN.includes(g));
}

/** What the chosen groups hold, together. */
export function chosenBytes(groups: CleanupGroup[], chosen: string[]): number {
  return groups
    .filter((g) => chosen.includes(g.group))
    .reduce((sum, g) => sum + g.bytes, 0);
}

/** Whether Home should mention it. */
export function worthMentioning(listing: CleanupListing | null): boolean {
  return listing !== null && listing.bytes >= NUDGE_BYTES;
}
