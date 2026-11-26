import type { ReportEntry } from "./types";

/**
 * Reports that count what waits on you (0.101.0; the owner's choice of 26 Nov 2026, "#3": the checks run by themselves on each
 * new save). The kit's manifest marks such a report with `waits`, naming the count in its data, such as a save check's faults
 * and things worth a look. The page list's scan runs each one and keeps its count here, for the Reports page's number, a count
 * beside the report and a note on Home.
 */
export type Watched = { entry: ReportEntry; waiting: number };

/** The reports on offer that count what waits on you. */
export function watchable(entries: ReportEntry[]): ReportEntry[] {
  return entries.filter((entry) => !!entry.waits);
}

/** What they found together; null when none could be read, so a number never stands for "unknown". */
export function totalWaiting(found: Watched[] | undefined): number | null {
  if (!found || found.length === 0) return null;
  return found.reduce((total, one) => total + one.waiting, 0);
}

/** The report to open from Home: the one with the most waiting, or none when nothing waits. */
export function firstToOpen(found: Watched[] | undefined): Watched | null {
  const waiting = (found ?? []).filter((one) => one.waiting > 0);
  if (waiting.length === 0) return null;
  return waiting.reduce((most, one) =>
    one.waiting > most.waiting ? one : most,
  );
}

/** The count beside one report in the list, when the last scan read it and something waits. */
export function waitingFor(
  found: Watched[] | undefined,
  entry: ReportEntry,
): number | null {
  const one = (found ?? []).find(
    (w) => w.entry.command === entry.command && w.entry.report === entry.report,
  );
  return one && one.waiting > 0 ? one.waiting : null;
}

/** The place that opens a report on the Reports page (its focus keys: `command`, `report`). */
export function reportFocus(entry: ReportEntry): Record<string, string> {
  return { command: entry.command, report: entry.report ?? "" };
}
