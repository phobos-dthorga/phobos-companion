import type { Block, Cell, Report, Sort, TableBlockData } from "./types";

export const DEFAULT_TOP = 100;
export const MAX_TOP = 5000;
const SHOW_MORE_FACTOR = 5;
const LOCALE = "en-AU";

const collator = new Intl.Collator(LOCALE, {
  numeric: true,
  sensitivity: "base",
});

export function cellText(cell: Cell): string {
  if (cell === null) return "";
  if (typeof cell === "number") {
    return cell.toLocaleString(LOCALE, { maximumFractionDigits: 4 });
  }
  return String(cell);
}

export function isNumericColumn(
  table: TableBlockData,
  column: number,
): boolean {
  return table.values.some((row) => row[column] !== null);
}

/** The next sort after a click on a heading: numbers start biggest first, words A to Z, and a second click reverses. */
export function nextSort(
  table: TableBlockData,
  current: Sort | null,
  column: number,
): Sort {
  if (current?.column === column) {
    return { column, descending: !current.descending };
  }
  return { column, descending: isNumericColumn(table, column) };
}

/** The rows' order under a sort. Empty cells stay last either way, and ties keep the report's order. */
export function sortedIndexes(
  table: TableBlockData,
  sort: Sort | null,
): number[] {
  const indexes = table.rows.map((_, index) => index);
  if (sort === null) return indexes;
  const { column, descending } = sort;
  const numeric = isNumericColumn(table, column);
  const sign = descending ? -1 : 1;
  const empty = (index: number) =>
    numeric
      ? table.values[index][column] === null
      : cellText(table.rows[index][column]) === "";
  return indexes.sort((a, b) => {
    if (empty(a) !== empty(b)) return empty(a) ? 1 : -1;
    if (empty(a)) return a - b;
    const order = numeric
      ? (table.values[a][column] as number) -
        (table.values[b][column] as number)
      : collator.compare(
          cellText(table.rows[a][column]),
          cellText(table.rows[b][column]),
        );
    return sign * order || a - b;
  });
}

function blocksOf(report: Report): Block[] {
  return [...report.blocks, ...report.sections.flatMap((s) => s.blocks)];
}

/** Whether any table holds more rows than the report showed. */
export function hasMoreRows(report: Report): boolean {
  return blocksOf(report).some(
    (block) => block.type === "table" && block.total > block.rows.length,
  );
}

export function nextTop(top: number): number {
  return Math.min(top * SHOW_MORE_FACTOR, MAX_TOP);
}

/** A section's heading level, below the page's own heading. */
export function headingTag(level: number): "h2" | "h3" | "h4" {
  if (level <= 2) return "h2";
  return level === 3 ? "h3" : "h4";
}
