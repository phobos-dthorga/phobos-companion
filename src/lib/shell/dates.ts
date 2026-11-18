import { LOCALE } from "../i18n/runtime";

/**
 * Every date and time the window shows, written one way, in the words' own locale and the viewer's own time zone. Pages import
 * from here (some through their presentation module), never format a date themselves.
 */

const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/** A YYYY-MM-DD day as a local date; null when it is not one. */
function localDay(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : null;
}

/** An ISO time as a date; null when it is not one. */
function moment(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole calendar days between a moment and now, in the viewer's own time zone. */
export function daysSince(unix: number, now: Date): number {
  const days = Math.round(
    (startOfDay(now) - startOfDay(new Date(unix * 1000))) / DAY_MS,
  );
  return Math.max(days, 0);
}

/** "19 Nov 2026". */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatUnixDate(unix: number): string {
  return formatDate(new Date(unix * 1000));
}

/** "3:14 am". */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** A changelog's YYYY-MM-DD as a date, or the text as written if it isn't one. */
export function formatIsoDate(text: string): string {
  const day = localDay(text);
  return day ? formatDate(day) : text;
}

/** "18 Nov 2026" from an ISO time; the text itself when it isn't one. */
export function formatDay(iso: string | null | undefined): string {
  const date = moment(iso);
  return date ? formatDate(date) : (iso ?? "");
}

/** "18 Nov 2026, 8:07 pm" from an ISO time; the text itself when it isn't one. */
export function formatWhen(iso: string | null | undefined): string {
  const date = moment(iso);
  return date ? `${formatDate(date)}, ${formatTime(date)}` : (iso ?? "");
}

/** A moment's time of day; nothing when it is not a time. */
export function timeWords(iso: string): string {
  const date = moment(iso);
  return date ? formatTime(date) : "";
}

/** A moment's day in the viewer's own time zone, as YYYY-MM-DD; the first ten characters when it is not a time. */
export function dayOf(iso: string): string {
  const date = moment(iso);
  if (!date) return iso.slice(0, 10);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A YYYY-MM-DD day with its weekday: "Tue, 18 Nov 2026". */
export function dayWords(day: string): string {
  const date = localDay(day);
  if (!date) return day;
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** A YYYY-MM-DD day's number, and its month's short name with the year: { date: "18", month: "Nov 26" }. */
export function shortDay(day: string): { date: string; month: string } {
  const date = localDay(day);
  if (!date) return { date: day, month: "" };
  return {
    date: String(date.getDate()),
    month: new Intl.DateTimeFormat(LOCALE, {
      month: "short",
      year: "2-digit",
    }).format(date),
  };
}
