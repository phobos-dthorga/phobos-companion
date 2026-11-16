import type { Sighting, TestRow, VerdictWord } from "./types";

/** The four shelves of the Tests page, in the order they are shown. */
export type Shelf = "seen" | "waiting" | "judged" | "done";

export const SHELVES: Shelf[] = ["seen", "waiting", "judged", "done"];

/** Each shelf's button and the line under it, as message keys. */
export const SHELF_WORDS: Record<Shelf, { label: string; note: string }> = {
  seen: { label: "tests-shelf-seen", note: "tests-shelf-seen-note" },
  waiting: { label: "tests-shelf-waiting", note: "tests-shelf-waiting-note" },
  judged: { label: "tests-shelf-judged", note: "tests-shelf-judged-note" },
  done: { label: "tests-shelf-done", note: "tests-shelf-done-note" },
};

/** What a verdict says on its row, and in the line read out once it is recorded. */
export const VERDICT_WORDS: Record<
  VerdictWord,
  { shown: string; recorded: string }
> = {
  passed: { shown: "tests-you-passed", recorded: "tests-recorded-passed" },
  failed: { shown: "tests-you-failed", recorded: "tests-recorded-failed" },
  cleared: { shown: "tests-you-cleared", recorded: "tests-recorded-cleared" },
};

/**
 * Where a row belongs: judged when you have given a verdict the test list doesn't hold yet; seen when the game has seen it
 * working and nobody has judged it; done when the test list already says passed or failed, or holds your verdict; waiting
 * otherwise.
 */
export function shelfOf(row: TestRow): Shelf {
  if (row.verdict) return row.pending ? "judged" : "done";
  if (row.status === "passed" || row.status === "failed") return "done";
  if (row.seen.length > 0 || row.status === "seen") return "seen";
  return "waiting";
}

export function onShelf(rows: TestRow[], shelf: Shelf): TestRow[] {
  return rows.filter((row) => shelfOf(row) === shelf);
}

/** A test list's cells hold Markdown; the page shows plain words. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\\\|/g, "|")
    .replace(/\s+/g, " ")
    .trim();
}

/** The row's "what to do" and "what passes" cells: the third and the last, whatever the table calls them. */
export function steps(row: TestRow): { todo: string; passes: string } {
  const cells = Object.values(row.cells);
  return {
    todo: plainText(cells[2] ?? ""),
    passes: plainText(cells[cells.length - 1] ?? ""),
  };
}

/** "17 Nov 2026" from an ISO time, in the reader's own time zone. */
export function formatDay(iso: string): string {
  const moment = new Date(iso);
  if (Number.isNaN(moment.getTime())) return iso;
  return moment.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The latest sighting of a row, or null. */
export function lastSighting(row: TestRow): Sighting | null {
  return row.seen.reduce<Sighting | null>(
    (latest, s) => (latest === null || s.last > latest.last ? s : latest),
    null,
  );
}
