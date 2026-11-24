import type { UpdatesStatus } from "./types";

/** Whether the updater is still at work, so the page asks again in a moment. */
export function busy(status: UpdatesStatus): boolean {
  return (
    status.state === "waiting" ||
    status.state === "checking" ||
    status.state === "fetching"
  );
}

/** How much of a newer version is fetched, as a whole percentage; null while its size is not known. */
export function percent(got: number, total: number | null): number | null {
  if (!total || total <= 0) return null;
  return Math.min(100, Math.floor((got / total) * 100));
}

/** A size in megabytes, one decimal place. */
export function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/** The day a release was published, from its date as the host gives it ("2026-11-25 3:14:00.0 +00:00:00" or ISO), or null. */
export function releaseDay(date: string | null): string | null {
  if (!date) return null;
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(date.trim());
  return day ? day[1] : null;
}
