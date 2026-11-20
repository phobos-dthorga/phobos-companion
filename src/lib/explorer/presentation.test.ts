import { describe, expect, it } from "vitest";
import {
  clockOf,
  kindPager,
  pagerOf,
  releasedKey,
  rootWords,
  secondsLeft,
  shortName,
  skipOf,
  viewOf,
} from "./presentation";
import type { KindPage, Path } from "./types";

const path = (root: string, name: string | null = null): Path => ({
  root,
  static: name,
  pinned: false,
  links: [],
  skipped: 0,
});

describe("the time a snapshot has left", () => {
  it("counts down from its first line, never below nought", () => {
    const ready = { limitSeconds: 600, ageSeconds: 0.4 };
    expect(secondsLeft(ready, 1000, 1000)).toBe(600);
    expect(secondsLeft(ready, 1000, 61_000)).toBe(540);
    expect(secondsLeft(ready, 1000, 700_000)).toBe(0);
  });

  it("reads as a clock", () => {
    expect(clockOf(600)).toBe("10:00");
    expect(clockOf(65)).toBe("1:05");
    expect(clockOf(-3)).toBe("0:00");
  });
});

describe("where a path starts", () => {
  it("names the static field when there is one, else the kind of root", () => {
    expect(rootWords(path("StaticVar", "Verse.LoadedModManager.mods"))).toEqual(
      {
        key: "explorer-root-static",
        args: { name: "Verse.LoadedModManager.mods" },
      },
    );
    expect(rootWords(path("Stack")).key).toBe("explorer-root-stack");
    expect(rootWords(path("FinalizerQueue")).key).toBe(
      "explorer-root-finalizer",
    );
    expect(rootWords(path("RefCountedHandle"))).toEqual({
      key: "explorer-root-other",
      args: { root: "RefCountedHandle" },
    });
  });
});

describe("paging what the host is asked for", () => {
  it("skips the pages before", () => {
    expect(skipOf(1)).toBe(0);
    expect(skipOf(3)).toBe(100);
    expect(skipOf(0)).toBe(0);
    expect(skipOf(2, 25)).toBe(25);
  });

  it("counts pages when the whole count is known, and leaves them open when a filter hides it", () => {
    expect(pagerOf(2, 50, 120)).toEqual({
      page: 2,
      pages: 3,
      first: 51,
      last: 100,
      total: 120,
    });
    expect(pagerOf(1, 0, null)).toEqual({
      page: 1,
      pages: null,
      first: 0,
      last: 0,
      total: null,
    });
    const kind: KindPage = {
      type: "Verse.Pawn",
      count: 900,
      totalBytes: 1,
      skip: 0,
      take: 50,
      more: true,
      match: "Ann",
      items: [{ address: "0x1", size: 10, summary: "Ann" }],
    };
    expect(kindPager(kind, 1).pages).toBeNull();
    expect(kindPager({ ...kind, match: "" }, 1).pages).toBe(18);
  });
});

describe("what the page shows from its place", () => {
  const known = (token: string) => token === "o1";

  it("starts with nothing held, and says an object or a kind is gone with its snapshot", () => {
    expect(viewOf({}, null, known)).toEqual({ name: "start" });
    expect(viewOf({ start: "yes" }, null, known)).toEqual({ name: "start" });
    expect(
      viewOf({ view: "object", snapshot: "2", object: "o1" }, null, known),
    ).toEqual({ name: "gone", was: "object" });
    expect(viewOf({ view: "kind", kind: "Verse.Pawn" }, null, known)).toEqual({
      name: "gone",
      was: "kind",
    });
  });

  it("opens an object only in the snapshot it was found in", () => {
    expect(
      viewOf({ view: "object", snapshot: "3", object: "o1" }, 3, known),
    ).toEqual({ name: "object", token: "o1" });
    expect(
      viewOf({ view: "object", snapshot: "2", object: "o1" }, 3, known),
    ).toEqual({ name: "gone", was: "object" });
    expect(
      viewOf({ view: "object", snapshot: "3", object: "o9" }, 3, known),
    ).toEqual({ name: "gone", was: "object" });
  });

  it("opens a kind in any snapshot, with its filter, order and page", () => {
    expect(
      viewOf(
        {
          view: "kind",
          kind: "Verse.Pawn",
          match: "Ann",
          largest: "yes",
          page: "3",
        },
        3,
        known,
      ),
    ).toEqual({
      name: "kind",
      kind: "Verse.Pawn",
      match: "Ann",
      largest: true,
      page: 3,
    });
    expect(viewOf({ view: "kind", kind: "A", page: "x" }, 3, known)).toEqual({
      name: "kind",
      kind: "A",
      match: "",
      largest: false,
      page: 1,
    });
    expect(viewOf({}, 3, known)).toEqual({ name: "overview" });
  });
});

describe("words", () => {
  it("say why a snapshot went", () => {
    expect(releasedKey("limit")).toBe("explorer-released-limit");
    expect(releasedKey("gone")).toBe("explorer-released-gone");
  });

  it("shorten a type's name for a heading", () => {
    expect(shortName("Verse.Pawn")).toBe("Pawn");
    expect(shortName("System.Collections.Generic.List<Verse.Thing>")).toBe(
      "List<Verse.Thing>",
    );
    expect(shortName("Pawn")).toBe("Pawn");
  });
});
