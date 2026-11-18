export { formatDay } from "../shell/dates";
import type {
  DecisionWord,
  PartCheck,
  Sighting,
  TestList,
  TestRow,
  VerdictWord,
} from "./types";

/**
 * The shelves of the Tests page, in the order they are shown. "check" and "unrowed" came with the kit's judged evidence (0.9.0):
 * rows whose notes don't stand as evidence, and notes no row names.
 */
export type Shelf =
  "seen" | "check" | "waiting" | "judged" | "done" | "unrowed";

export const SHELVES: Shelf[] = [
  "seen",
  "check",
  "waiting",
  "judged",
  "done",
  "unrowed",
];

/** Each shelf's button and the line under it, as message keys. */
export const SHELF_WORDS: Record<Shelf, { label: string; note: string }> = {
  seen: { label: "tests-shelf-seen", note: "tests-shelf-seen-note" },
  check: { label: "tests-shelf-check", note: "tests-shelf-check-note" },
  waiting: { label: "tests-shelf-waiting", note: "tests-shelf-waiting-note" },
  judged: { label: "tests-shelf-judged", note: "tests-shelf-judged-note" },
  done: { label: "tests-shelf-done", note: "tests-shelf-done-note" },
  unrowed: { label: "tests-shelf-unrowed", note: "tests-shelf-unrowed-note" },
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

/** The line read out once a decision on a note no row names is recorded. */
export const DECISION_WORDS: Record<DecisionWord, string> = {
  "make-row": "tests-decided-make-row",
  "no-row": "tests-decided-no-row",
  cleared: "tests-decided-cleared",
};

/** Something about a row's notes to look into: they came, but they don't stand as evidence. */
export type Concern =
  | { kind: "off"; part: string; saw: string; expects: string }
  | { kind: "stale"; part: string; version: string }
  | { kind: "order"; rule: string; on: string; time: string; detail: string };

/** A note's figures as "W 0.09, loadsA 0"; empty when it has none. */
export function figures(values: Record<string, number> | undefined): string {
  return Object.entries(values ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name} ${value}`)
    .join(", ");
}

/** Everything about a row's notes to look into: figures off, seen only before the row changed, out of order. */
export function concerns(row: TestRow): Concern[] {
  const found: Concern[] = [];
  for (const part of row.parts ?? []) {
    if (part.state === "off") {
      found.push({
        kind: "off",
        part: part.name,
        saw: figures(part.off.at(-1)?.values),
        expects: part.expected.join("; "),
      });
    } else if (part.state === "stale") {
      found.push({
        kind: "stale",
        part: part.name,
        version: part.stale_version,
      });
    }
  }
  for (const problem of row.order_problems ?? []) {
    found.push({
      kind: "order",
      rule: problem.rule,
      on: problem.kind || problem.on,
      time: problem.time,
      detail: problem.detail,
    });
  }
  return found;
}

function counts(part: PartCheck): boolean {
  return part.state === "seen" || part.state === "expected";
}

/** For a row in parts: which were seen and which are still to see; null for a row of one part. */
export function partsSummary(
  row: TestRow,
): { seen: string[]; missing: string[]; total: number } | null {
  const parts = row.parts ?? [];
  if (parts.length < 2) return null;
  return {
    seen: parts.filter(counts).map((p) => p.name),
    missing: parts.filter((p) => !counts(p)).map((p) => p.name),
    total: parts.length,
  };
}

/**
 * Where a row belongs: judged when you have given a verdict the test list doesn't hold yet; done when the test list already says
 * passed or failed, or holds your verdict; seen when the game has seen it working and nobody has judged it; to look into when
 * notes came but none stands as evidence; waiting otherwise.
 */
export function shelfOf(row: TestRow): Shelf {
  if (row.verdict) return row.pending ? "judged" : "done";
  if (row.status === "passed" || row.status === "failed") return "done";
  if (row.seen.length > 0 || row.status === "seen") return "seen";
  if (concerns(row).length > 0) return "check";
  return "waiting";
}

export function onShelf(rows: TestRow[], shelf: Shelf): TestRow[] {
  return rows.filter((row) => shelfOf(row) === shelf);
}

/** How many entries a shelf holds across the lists: rows, or notes no row names. */
export function shelfCount(lists: TestList[], shelf: Shelf): number {
  return lists.reduce(
    (sum, list) =>
      sum +
      (shelf === "unrowed"
        ? (list.unrowed ?? []).length
        : onShelf(list.rows, shelf).length),
    0,
  );
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

/** The latest sighting of a row, or null. */
export function lastSighting(row: TestRow): Sighting | null {
  return row.seen.reduce<Sighting | null>(
    (latest, s) => (latest === null || s.last > latest.last ? s : latest),
    null,
  );
}
