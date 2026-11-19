import { readCleanup } from "./desktopClient";
import type { CleanupListing } from "./types";

/**
 * The latest cleanup listing, shared by Home's note and the Settings page's panel (0.27.0): a listing takes several seconds, so
 * Home reads one at most every half hour, and the panel's own reading or cleaning refreshes it.
 */
const FRESH_MS = 30 * 60 * 1000;

export const latest = $state<{ listing: CleanupListing | null; at: number }>({
  listing: null,
  at: 0,
});

export function keep(listing: CleanupListing): void {
  latest.listing = listing;
  latest.at = Date.now();
}

/** Reads again when the latest is older than half an hour; quiet, for Home. */
export async function refreshIfStale(): Promise<void> {
  if (Date.now() - latest.at < FRESH_MS) return;
  latest.at = Date.now();
  const answer = await readCleanup();
  if (answer.state === "ready") keep(answer.listing);
}
