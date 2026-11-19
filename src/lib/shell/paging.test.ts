import { describe, expect, it } from "vitest";
import { pageFrom, pageHolding, pageOf } from "./paging";

describe("pages of a long list", () => {
  const list = Array.from({ length: 23 }, (_, i) => i + 1);

  it("gives a page's items and where they sit", () => {
    expect(pageOf(list, 2, 10)).toEqual({
      items: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      page: 2,
      pages: 3,
      first: 11,
      last: 20,
      total: 23,
    });
    expect(pageOf(list, 3, 10).items).toEqual([21, 22, 23]);
  });

  it("keeps a page inside the pages there are", () => {
    expect(pageOf(list, 9, 10).page).toBe(3);
    expect(pageOf(list, 0, 10).page).toBe(1);
    expect(pageOf([], 4, 10)).toEqual({
      items: [],
      page: 1,
      pages: 1,
      first: 0,
      last: 0,
      total: 0,
    });
  });

  it("finds the page an item falls on, and reads a page from an address", () => {
    expect(pageHolding(0, 10)).toBe(1);
    expect(pageHolding(10, 10)).toBe(2);
    expect(pageFrom("3")).toBe(3);
    expect(pageFrom(undefined)).toBe(1);
    expect(pageFrom("nonsense")).toBe(1);
  });
});
