import type { PageName } from "../navigation/place";

/** How long a scan stands before coming back to the window asks again (0.67.0; agent's choice, owner to change). */
export const SCAN_STALE_MS = 5 * 60 * 1000;

/**
 * What each scan found for a page, by part: Mods adds its settings to look at, its things to do and the updates that touch
 * ours. Null is a part that could not be read, or has nothing to say.
 */
export type Parts = Partial<Record<PageName, Record<string, number | null>>>;

/** One more part's answer, without changing the parts given. */
export function withPart(
  parts: Parts,
  page: PageName,
  part: string,
  count: number | null,
): Parts {
  return { ...parts, [page]: { ...(parts[page] ?? {}), [part]: count } };
}

/**
 * Each page's number: its parts added up. Only numbers above nought are kept (0.66.0), so a page with nothing waiting, or whose
 * parts could not be read, shows no mark: a number never stands for "unknown".
 */
export function counted(parts: Parts): Partial<Record<PageName, number>> {
  const found: Partial<Record<PageName, number>> = {};
  for (const [page, answers] of Object.entries(parts)) {
    const sum = Object.values(answers ?? {}).reduce<number>(
      (total, count) => total + (count ?? 0),
      0,
    );
    if (sum > 0) found[page as PageName] = sum;
  }
  return found;
}

/** Whether a scan made then is old enough to make again now. */
export function scanIsStale(at: number, now: number): boolean {
  return now - at >= SCAN_STALE_MS;
}
