import { readCommunityLists } from "./desktopClient";
import type { OnProgress } from "../shell/progress";

/** Games whose stale community lists were asked for this run (0.112.0): the Mod list fetches those over a week old once a run,
 *  as RimSort did at its start, so the sorter and the check never read a list long gone stale. */
const asked = new Set<string>();

/** Fetches the game's community lists that are over a week old, once a run; quietly does nothing when Community lists is off. */
export async function refreshStaleOnce(
  game: string,
  onProgress?: OnProgress,
): Promise<void> {
  if (asked.has(game)) return;
  asked.add(game);
  await readCommunityLists(game, true, true, onProgress);
}
