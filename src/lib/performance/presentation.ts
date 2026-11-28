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
