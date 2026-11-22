import type { PageName } from "../navigation/place";

/** Only counts above nought (0.66.0), so a page with nothing waiting, or whose count could not be read, shows no mark. */
export function counted(
  found: Partial<Record<PageName, number | null>>,
): Partial<Record<PageName, number>> {
  return Object.fromEntries(
    Object.entries(found).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && entry[1] > 0,
    ),
  ) as Partial<Record<PageName, number>>;
}
