import { LOCALE } from "../i18n/runtime";
import type { ProgressState } from "../shell/progress";
import type { KeptWatch, Latest, StatusData, WatchState } from "./types";

/** The lengths offered, in minutes; the host refuses any other. The owner found 60 "a bit generous" and 15 to 20 workable. */
export const MINUTES = [5, 10, 15, 20, 30, 60] as const;
export const DEFAULT_MINUTES = 15;

/** How often the page reads a running watch again (the kit samples every 5 s; a read costs about 0.2 s). */
export const POLL_MS = 5000;

/** Marks made with one press, for what the owner does most often (agent's choice of words; the owner can type any). */
export const QUICK_MARKS = [
  "memory-quick-reloading",
  "memory-quick-loaded",
  "memory-quick-world",
  "memory-quick-playing",
  "memory-quick-paused",
] as const;

/** Whether a watch is still going: sampling, or reading in its counters and the log. */
export function alive(state: WatchState | "none"): boolean {
  return state === "running" || state === "finishing";
}

/** Bytes as the tools write them: decimal GB to two places, MB to one, so the page's figures match the report's. */
export function formatMemory(bytes: number | null): string {
  if (bytes === null) return "–";
  const number = (value: number, digits: number) =>
    value.toLocaleString(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  if (Math.abs(bytes) >= 1e9) return `${number(bytes / 1e9, 2)} GB`;
  if (Math.abs(bytes) >= 1e6) return `${number(bytes / 1e6, 1)} MB`;
  return `${number(bytes / 1e3, 0)} KB`;
}

/** A moment to the second ("8:54:19 pm"): marks and loads a minute apart need their seconds. */
export function formatClock(unix: number): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(unix * 1000));
}

/** A kept watch's start as a day and time ("19 Nov, 8:54 pm"). */
export function formatStarted(unix: number): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(unix * 1000));
}

/** The figures shown as tiles, in the order a person reads them: what the game claimed, then where it sits. */
export function tiles(
  latest: Latest,
): { key: string; value: string; known: boolean }[] {
  return [
    { key: "memory-tile-claimed", value: latest.claimed, known: true },
    { key: "memory-tile-ram", value: latest.in_ram, known: true },
    {
      key: "memory-tile-collector",
      value: latest.collector,
      known: latest.collector !== null,
    },
    {
      key: "memory-tile-outside",
      value: latest.outside,
      known: latest.outside !== null,
    },
  ].map((tile) => ({ ...tile, value: formatMemory(tile.value) }));
}

/** A running watch's bar, counted from its own clock when this window did not start it (or was reopened since). */
export function progressFromStatus(
  status: StatusData,
  label: string,
): ProgressState {
  if (status.state === "none")
    return { label, step: null, of: null, detail: "", done: [] };
  const counted = status.state === "running" && status.seconds > 0;
  return {
    label,
    step: counted ? Math.min(status.elapsed, status.seconds) : null,
    of: counted ? status.seconds : null,
    detail: status.latest
      ? `${formatMemory(status.latest.claimed)} · ${formatMemory(status.latest.in_ram)}`
      : "",
    done: [],
  };
}

/** Whole minutes left of a running watch, never below nought. */
export function minutesLeft(status: StatusData): number {
  if (status.state === "none") return 0;
  return Math.max(0, Math.ceil((status.seconds - status.elapsed) / 60));
}

/** The words key for a watch's state. */
export function stateKey(state: WatchState): string {
  return {
    running: "memory-state-running",
    finishing: "memory-state-finishing",
    ended: "memory-state-ended",
    "cut-off": "memory-state-cut-off",
  }[state];
}

/** The watch the page shows: the one the place names if it is kept, else the one the status read. */
export function shownWatch(
  focus: string | undefined,
  status: StatusData | null,
): string | null {
  if (focus && status?.kept.some((kept) => kept.watch === focus)) return focus;
  return status?.watch ?? null;
}

/** A kept watch in a line: its start, label and length. */
export function keptWords(kept: KeptWatch): string {
  const label = kept.label ? ` · ${kept.label}` : "";
  return `${formatStarted(kept.started)}${label}`;
}
