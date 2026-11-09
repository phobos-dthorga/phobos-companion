import { describe, expect, it } from "vitest";
import {
  cellText,
  hasMoreRows,
  headingTag,
  MAX_TOP,
  nextSort,
  nextTop,
  sortedIndexes,
} from "./presentation";
import type { Cell, Report, TableBlockData } from "./types";

function table(
  rows: Cell[][],
  values: (number | null)[][],
  total = rows.length,
): TableBlockData {
  return { type: "table", headers: ["A"], rows, values, total };
}

const numbers = table([["5%"], ["12.5%"], ["1%"]], [[5], [12.5], [1]]);
const words = table(
  [["pear"], ["Apple"], ["item 10"], ["item 2"]],
  [[null], [null], [null], [null]],
);

describe("sorting", () => {
  it("leaves the report's order alone until asked", () => {
    expect(sortedIndexes(numbers, null)).toEqual([0, 1, 2]);
  });

  it("sorts numbers as numbers, not as text", () => {
    expect(sortedIndexes(numbers, { column: 0, descending: true })).toEqual([
      1, 0, 2,
    ]);
  });

  it("sorts words A to Z, ignoring case, with numbers in words in order", () => {
    expect(sortedIndexes(words, { column: 0, descending: false })).toEqual([
      1, 3, 2, 0,
    ]);
  });

  it("keeps empty cells last both ways", () => {
    const gaps = table([["3"], [""], ["9"]], [[3], [null], [9]]);
    expect(sortedIndexes(gaps, { column: 0, descending: true })).toEqual([
      2, 0, 1,
    ]);
    expect(sortedIndexes(gaps, { column: 0, descending: false })).toEqual([
      0, 2, 1,
    ]);
  });

  it("keeps ties in the report's order", () => {
    const tied = table([["1"], ["1"], ["1"]], [[1], [1], [1]]);
    expect(sortedIndexes(tied, { column: 0, descending: true })).toEqual([
      0, 1, 2,
    ]);
  });
});

describe("clicking a heading", () => {
  it("starts numbers biggest first and words A to Z", () => {
    expect(nextSort(numbers, null, 0).descending).toBe(true);
    expect(nextSort(words, null, 0).descending).toBe(false);
  });

  it("reverses on a second click", () => {
    expect(
      nextSort(numbers, { column: 0, descending: true }, 0).descending,
    ).toBe(false);
  });
});

describe("cells", () => {
  it("shows numbers the way people read them", () => {
    expect(cellText(1234567)).toBe("1,234,567");
    expect(cellText(null)).toBe("");
    expect(cellText("as written")).toBe("as written");
  });
});

describe("showing more", () => {
  const report = (total: number): Report => ({
    format: 1,
    title: "t",
    lines: [],
    blocks: [],
    sections: [
      { heading: "s", level: 2, blocks: [table([["a"]], [[null]], total)] },
    ],
  });

  it("knows when a table was cut short", () => {
    expect(hasMoreRows(report(1))).toBe(false);
    expect(hasMoreRows(report(40))).toBe(true);
  });

  it("asks for more, up to the limit", () => {
    expect(nextTop(100)).toBe(500);
    expect(nextTop(2500)).toBe(MAX_TOP);
  });
});

describe("headings", () => {
  it("nests under the page's own heading", () => {
    expect(headingTag(2)).toBe("h2");
    expect(headingTag(3)).toBe("h3");
    expect(headingTag(6)).toBe("h4");
  });
});
