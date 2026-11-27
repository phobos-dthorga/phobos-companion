import type { Dump } from "./types";

/** Before anything was marked seen, crashes this recent are shown (0.105.0; agent default): older ones were dealt with. */
export const FIRST_REACH_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The dumps written after the newest one the person saw, newest first; before any was seen, those of the last week. */
export function newDumps(
  dumps: Dump[],
  seen: string | null,
  now: Date,
): Dump[] {
  const after = seen
    ? Date.parse(seen)
    : now.getTime() - FIRST_REACH_DAYS * DAY_MS;
  return dumps
    .filter((dump) => Date.parse(dump.time) > after)
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
}

/** The newest dump's time: what Got it marks as seen. */
export function newestTime(dumps: Dump[]): string | null {
  let newest: string | null = null;
  for (const dump of dumps) {
    if (newest === null || Date.parse(dump.time) > Date.parse(newest))
      newest = dump.time;
  }
  return newest;
}
