import { readCatalogue, runReport } from "./desktopClient";
import { DEFAULT_TOP } from "./presentation";
import { totalWaiting, watchable, type Watched } from "./watching";

/**
 * The last count of each report that counts what waits on you, by game (0.101.0): read by the page list's scan (on showing a
 * game, on Look again, and on coming back to the window once the last scan is five minutes old), shown beside the Reports page,
 * beside the report itself and on Home. RimWorld's save checks are one: so a state the rules say should never be is found in the
 * newest save without anyone running the check. Each report only reads; one runs at a time, so two never read a save at once.
 */
export const watched = $state<{ found: Record<string, Watched[]> }>({
  found: {},
});

/** Runs every such report for a game and keeps their counts; the total, or null when none could be read. */
export async function scanWatched(game: string): Promise<number | null> {
  const catalogue = await readCatalogue(game);
  if (catalogue.state !== "ready") return null;
  const found: Watched[] = [];
  for (const entry of watchable(catalogue.entries)) {
    const answer = await runReport(game, entry, DEFAULT_TOP);
    if (answer.state === "ready" && typeof answer.result.waiting === "number")
      found.push({ entry, waiting: answer.result.waiting });
  }
  watched.found[game] = found;
  return totalWaiting(found);
}
