import { readModList } from "./desktopClient";
import type { ModListCheck } from "./types";

/**
 * The latest check of each game, shared by Home's note and the Mod list page (0.45.0). Home reads quietly, without asking Steam,
 * at most every half hour; the page's own readings and changes refresh it.
 */
const FRESH_MS = 30 * 60 * 1000;

export const latest = $state<{
  checks: Record<string, ModListCheck>;
  at: Record<string, number>;
}>({ checks: {}, at: {} });

export function keep(game: string, check: ModListCheck): void {
  latest.checks[game] = check;
  latest.at[game] = Date.now();
}

/** Reads again when the game's latest is older than half an hour; quiet, for Home. */
export async function refreshIfStale(game: string): Promise<void> {
  if (Date.now() - (latest.at[game] ?? 0) < FRESH_MS) return;
  latest.at[game] = Date.now();
  const answer = await readModList(game, false);
  if (answer.state === "ready") keep(game, answer.check);
}
