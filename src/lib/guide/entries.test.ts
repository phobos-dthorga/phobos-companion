import { describe, expect, it } from "vitest";
import { PAGE_NAMES, type PageName } from "../navigation/place";
import {
  destination,
  ENTRIES,
  entry,
  linksOf,
  pageEntry,
  parseEntry,
  pieces,
  search,
} from "./entries";

/**
 * What each page takes from an address (docs/cross-links.md, N3), so a Take me there never asks a page for something it cannot
 * show. A page missing here takes nothing.
 */
const FOCUS_KEYS: Partial<Record<PageName, string[]>> = {
  changes: ["repository", "changelog", "product", "page"],
  codemap: ["repository", "node", "their", "update", "owner", "member"],
  timeline: ["day"],
  tests: ["repository", "row"],
  settings: ["key", "panel"],
  mods: ["repository", "mod", "changelog", "before", "panel"],
  logs: ["signature"],
  memory: ["watch"],
  reports: ["command", "report"],
  guide: ["entry"],
};
const PANELS: Partial<Record<PageName, string[]>> = {
  settings: ["records", "cleanup", "themes", "games", "agents"],
  mods: ["settings"],
};

describe("the Guide's entries", () => {
  it("are all read without a fault, about fifty of them", () => {
    expect(ENTRIES.length).toBeGreaterThanOrEqual(45);
  });

  it("give every page its entry, which F1 opens", () => {
    const missing = PAGE_NAMES.filter((page) => !pageEntry(page));
    expect(missing).toEqual([]);
  });

  it("link only to entries that exist", () => {
    const broken = ENTRIES.flatMap((e) =>
      linksOf(e)
        .filter((id) => !entry(id))
        .map((id) => `${e.id} -> ${id}`),
    );
    expect(broken).toEqual([]);
  });

  it("take you only where a page can show", () => {
    const wrong = ENTRIES.filter((e) => e.go).flatMap((e) => {
      const { page, focus } = e.go!;
      const allowed = FOCUS_KEYS[page] ?? [];
      return Object.entries(focus)
        .filter(
          ([key, value]) =>
            !allowed.includes(key) ||
            (key === "panel" && !(PANELS[page] ?? []).includes(value)),
        )
        .map(([key, value]) => `${e.id}: ${page}?${key}=${value}`);
    });
    expect(wrong).toEqual([]);
  });

  it("every How do I…? answer either takes you there or says which key to press", () => {
    const lost = ENTRIES.filter(
      (e) =>
        e.kind === "task" &&
        !e.go &&
        !/\*\*.\*\*|\*\*[A-Z]\*\*/.test(
          e.text + e.blocks.map((b) => JSON.stringify(b)).join(""),
        ),
    ).map((e) => e.id);
    expect(lost).toEqual([]);
  });

  it("are each reached from somewhere besides the index: a link, a See also or a page", () => {
    const reached = new Set(ENTRIES.flatMap(linksOf));
    const alone = ENTRIES.filter(
      (e) => e.kind !== "page" && !reached.has(e.id),
    ).map((e) => e.id);
    expect(alone).toEqual([]);
  });
});

describe("reading an entry", () => {
  it("reads its header, its steps, its bullets and its headings", () => {
    const read = parseEntry(
      "task-sample",
      "---\ntitle: Do a thing\nkind: task\ngo: settings?panel=records\nwords: one, two\nsee: page-home\n---\nFirst words.\n\n1. Press **A**.\n2. Then `B`.\n\n### More\n- A [link](page-home).\n",
    );
    expect(read.title).toBe("Do a thing");
    expect(read.go).toEqual({ page: "settings", focus: { panel: "records" } });
    expect(read.words).toEqual(["one", "two"]);
    expect(read.blocks.map((b) => b.kind)).toEqual([
      "para",
      "list",
      "heading",
      "list",
    ]);
    expect(read.text).toContain("Press A.");
  });

  it("says what is wrong with a broken one", () => {
    expect(() => parseEntry("x", "no header")).toThrow(/header/);
    expect(() =>
      parseEntry("x", "---\ntitle: X\nkind: idea\n---\nWords."),
    ).toThrow(/kind/);
    expect(() =>
      parseEntry("x", "---\ntitle: X\nkind: page\n---\nWords."),
    ).toThrow(/names its page/);
    expect(() =>
      parseEntry("x", "---\ntitle: X\nkind: term\ncolour: red\n---\nWords."),
    ).toThrow(/not one of/);
    expect(() => destination("nowhere?x=1")).toThrow(/not a page/);
    expect(() =>
      parseEntry("x", "---\ntitle: X\nkind: term\nfor: robots\n---\nWords."),
    ).toThrow(/only be agents/);
  });

  it("marks an entry about features for agent sessions (0.37.0), and only that one", () => {
    const marked = parseEntry(
      "term-x",
      "---\ntitle: X\nkind: term\nfor: agents\n---\nWords.",
    );
    expect(marked.forAgents).toBe(true);
    expect(
      parseEntry("term-y", "---\ntitle: Y\nkind: term\n---\nWords.").forAgents,
    ).toBe(false);
    // The Decisions page and the words for what agent sessions do are marked, so a person without them reads past them.
    for (const id of [
      "page-decisions",
      "term-claim",
      "term-screen-note",
      "task-something-off",
    ])
      expect(entry(id)?.forAgents).toBe(true);
    expect(entry("page-home")?.forAgents).toBe(false);
  });

  it("turns links into pieces of their own, and leaves the rest as written", () => {
    expect(pieces("See [backups](term-backup), **now**.")).toEqual([
      { text: "See ", style: "plain" },
      { style: "link", text: "backups", id: "term-backup" },
      { text: ", ", style: "plain" },
      { text: "now", style: "bold" },
      { text: ".", style: "plain" },
    ]);
  });
});

describe("searching the Guide", () => {
  it("finds the answer by the words you would use", () => {
    expect(search("go back")[0].id).toBe("task-go-back");
    expect(search("restore").map((e) => e.id)).toContain("task-go-back");
    expect(search("backup records")[0].id).toBe("task-records-backup");
    expect(search("theme").map((e) => e.id)).toContain("task-change-theme");
    expect(search("F1").map((e) => e.id)).toContain("page-guide");
  });

  it("needs every word, and finds nothing for nothing", () => {
    expect(search("")).toEqual([]);
    expect(search("backup zzqx")).toEqual([]);
  });
});
