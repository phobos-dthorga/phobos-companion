import { LOCALE } from "../i18n/runtime";
import type { LookKind, Summary } from "./types";

/** The lengths offered, in seconds; the host refuses any other (agent's choice, owner to revise: 30 first, as the kit's own). */
export const SECONDS = [15, 30, 60] as const;
export const DEFAULT_SECONDS = 30;

/** The closer looks, in the order the page offers them. */
export const LOOKS: readonly LookKind[] = [
  "callers",
  "mod",
  "compare",
  "trend",
];

/** Each look's message key, written out so the catalogue check finds them. */
export const LOOK_WORDS: Record<LookKind, string> = {
  callers: "performance-look-callers",
  mod: "performance-look-mod",
  compare: "performance-look-compare",
  trend: "performance-look-trend",
};

/** Whether a look needs words or a choice before it can run. */
export function lookNeedsText(kind: LookKind): boolean {
  return kind !== "trend";
}

/** A figure as the page shows it: whole numbers with thousands marks, or "–" when there is none. */
export function figure(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "–";
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** The first finding of a recording, or null when it has none. */
export function firstFinding(summary: Summary): string | null {
  return summary.findings?.[0]?.text ?? null;
}

/** Whether a recording's first finding is a risk: something to act on. */
export function firstIsRisk(summary: Summary): boolean {
  return summary.findings?.[0]?.role === "risk";
}

/** The day a recording was made, from its name (`20261118-081449-…`), as the Timeline's `day` reads it; null if unreadable. */
export function dayOf(recording: string): string | null {
  const found = /^(\d{4})(\d{2})(\d{2})-/.exec(recording);
  return found ? `${found[1]}-${found[2]}-${found[3]}` : null;
}

/** The recording to show: the one chosen when it is kept, else the newest; null when none is kept. */
export function chosenRecording(
  chosen: string | undefined,
  recordings: Summary[],
): string | null {
  if (chosen && recordings.some((r) => r.recording === chosen)) return chosen;
  return recordings[0]?.recording ?? null;
}

/** Every other recording, for comparing with the one shown. */
export function others(recordings: Summary[], shown: string): Summary[] {
  return recordings.filter((r) => r.recording !== shown);
}

/** A share of ticking, in %, as a tag shows it: one decimal under 10, none above. */
export function shareWords(share: number): string {
  return `${figure(share, share < 10 ? 1 : 0)}%`;
}

/** A change in points against the earlier recordings, signed ("+0.5", "−1.2"), or "±0" when it did not move. */
export function changeWords(change: number): string {
  if (Math.abs(change) < 0.05) return "±0";
  return `${change > 0 ? "+" : "−"}${figure(Math.abs(change), 1)}`;
}

/** Whether the kit marked our own mods' share as up on the earlier recordings' middle (its trend note opens "**up"). */
export function ownRose(note: string): boolean {
  return note.startsWith("**up");
}

/**
 * The recordings made for a test row (0.119.0, `docs/performance.md` B9): those whose label names it ("row 785"), as the test
 * list's steps ask (`perf.py record --label "row 785"`), newest first as kept.
 */
export function recordingsForRow(
  recordings: Summary[],
  row: string,
): Summary[] {
  const id = row.replace(/[^0-9A-Za-z]/g, "");
  const named = new RegExp(`(^|[^0-9A-Za-z])row ${id}(?![0-9A-Za-z])`, "i");
  return id ? recordings.filter((r) => named.test(r.label)) : [];
}
