import { describe, expect, it } from "vitest";
import {
  byDay,
  canReadAsItStood,
  canShowCode,
  dayOf,
  isKnownKind,
  KIND_LOOKS,
  lanes,
  lookOf,
  mergedFrom,
  OTHER_LOOK,
  monthStarts,
  rows,
  runningOn,
  showingFilter,
  stoodEntries,
  unlisted,
  withShotDays,
} from "./presentation";
import type { Fact, FactKind, StoodEntry } from "./types";

function fact(kind: FactKind, time: string, extra: Partial<Fact> = {}): Fact {
  return {
    kind,
    time,
    source: "git",
    product: "Thing",
    repository: "repo",
    changelog: "mods/Thing/CHANGELOG.md",
    ...extra,
  };
}

/** Noon UTC, which is the same day in every time zone from UTC−11 to UTC+11. */
const noon = (day: string) => `${day}T12:00:00+00:00`;

describe("the timeline's days", () => {
  it("groups facts by day, newest day and newest fact first", () => {
    const days = byDay([
      fact("version-written", noon("2026-11-01")),
      fact("entries-added", "2026-11-03T11:30:00+00:00"),
      fact("installed", "2026-11-03T12:30:00+00:00", { source: "log" }),
    ]);
    expect(days.map((d) => d.day)).toEqual(["2026-11-03", "2026-11-01"]);
    expect(days[0].facts.map((f) => f.kind)).toEqual([
      "installed",
      "entries-added",
    ]);
  });

  it("keeps only one source when asked", () => {
    const facts = [
      fact("installed", noon("2026-11-03"), { source: "log" }),
      fact("version-written", noon("2026-11-03")),
    ];
    expect(facts.filter(showingFilter("log")).map((f) => f.kind)).toEqual([
      "installed",
    ]);
    expect(facts.filter(showingFilter("git")).map((f) => f.kind)).toEqual([
      "version-written",
    ]);
    expect(facts.filter(showingFilter("all"))).toHaveLength(2);
  });

  it("reads a day in the viewer's own time zone", () => {
    expect(dayOf(noon("2026-11-18"))).toBe("2026-11-18");
    expect(dayOf("not a time")).toBe("not a time");
  });
});

describe("the overview's lanes", () => {
  it("gives each product a lane, most recently active first, with the strongest mark of each day", () => {
    const found = lanes([
      fact("product-started", noon("2026-10-20"), { product: "Old" }),
      fact("product-ended", noon("2026-11-02"), {
        product: "Old",
        mergedInto: "Thing",
      }),
      fact("entries-added", noon("2026-11-05")),
      fact("version-released", noon("2026-11-05")),
      fact("entries-reworded", noon("2026-11-05")),
      fact("encoded", noon("2026-11-06"), {
        product: undefined,
        source: "log",
      }),
    ]);
    expect(found.lanes.map((l) => [l.name, l.ended])).toEqual([
      ["Thing", false],
      ["Old", true],
    ]);
    expect(found.lanes[1].mergedInto).toBe("Thing");
    expect(found.lanes[0].mergedInto).toBeNull();
    expect(mergedFrom(found.lanes, "Thing")).toEqual(["Old"]);
    expect(mergedFrom(found.lanes, "Old")).toEqual([]);
    expect(found.lanes[0].cells.get("2026-11-05")?.strongest).toBe(
      "version-released",
    );
    expect(found.lanes[0].cells.get("2026-11-05")?.facts).toHaveLength(3);
    expect(found.days).toEqual(["2026-10-20", "2026-11-02", "2026-11-05"]);
  });

  it("names a month once, where it begins", () => {
    expect([
      ...monthStarts(["2026-10-20", "2026-10-28", "2026-11-02", "2026-11-05"]),
    ]).toEqual(["2026-10-20", "2026-11-02"]);
  });

  it("gives every kind a mark and a weight, no two the same weight", () => {
    const weights = Object.values(KIND_LOOKS).map((look) => look.weight);
    expect(new Set(weights).size).toBe(weights.length);
    expect(
      Object.values(KIND_LOOKS).every((look) => look.mark.length > 0),
    ).toBe(true);
  });

  it("shows a kind it has never heard of plainly, weakest of all, and never throws (0.117.1)", () => {
    // The owner's screen note of 28 Nov 2026: a newer kit's kind froze the page, because its look-up threw.
    const unheardOf = "something-new" as FactKind;
    expect(isKnownKind(unheardOf)).toBe(false);
    expect(lookOf(unheardOf)).toBe(OTHER_LOOK);
    expect(lookOf("installed")).toBe(KIND_LOOKS.installed);
    const weights = Object.values(KIND_LOOKS).map((look) => look.weight);
    expect(Math.min(...weights)).toBeGreaterThan(OTHER_LOOK.weight);
    const day = noon("2026-11-27");
    const found = lanes([
      fact(unheardOf, day, { source: "log", mod: "Thing", product: undefined }),
      fact("installed", day, { source: "log" }),
      fact(unheardOf, day, { source: "log" }),
    ]);
    expect(found.lanes[0].cells.get("2026-11-27")?.strongest).toBe("installed");
  });

  it("knows the kinds the kit's history log writes for this PC's upkeep", () => {
    for (const kind of ["backups-packed", "safe-copies", "mod-list-change"])
      expect(isKnownKind(kind)).toBe(true);
  });
});

describe("what a fact offers", () => {
  it("offers the changelog as it stood for a commit, or for a moment on this PC", () => {
    expect(
      canReadAsItStood(
        fact("version-written", noon("2026-11-05"), { commit: "401c6a93" }),
      ),
    ).toBe(true);
    expect(
      canReadAsItStood(
        fact("installed", noon("2026-11-05"), { source: "log", commit: null }),
      ),
    ).toBe(true);
    expect(
      canReadAsItStood(
        fact("encoded", noon("2026-11-05"), {
          source: "log",
          changelog: undefined,
        }),
      ),
    ).toBe(false);
  });

  it("offers code only for a fact from git with its commit", () => {
    expect(
      canShowCode(
        fact("version-written", noon("2026-11-05"), { commit: "401c6a93" }),
      ),
    ).toBe(true);
    expect(
      canShowCode(
        fact("installed", noon("2026-11-05"), {
          source: "log",
          commit: "401c6a93",
        }),
      ),
    ).toBe(false);
    expect(
      canShowCode(
        fact("version-written", noon("2026-11-05"), { commit: null }),
      ),
    ).toBe(false);
  });

  it("counts the entries the kit did not list", () => {
    expect(
      unlisted(
        fact("version-written", noon("2026-11-05"), {
          count: 11,
          entries: new Array(8).fill({ lead: "x", section: "" }),
        }),
      ),
    ).toBe(3);
    expect(unlisted(fact("version-written", noon("2026-11-05")))).toBe(0);
  });

  it("keeps only what changed since, when asked", () => {
    const entries: StoodEntry[] = [
      { section: "", text: "a", lead: "a", since: "kept", now: null },
      { section: "", text: "b", lead: "b", since: "removed", now: null },
    ];
    expect(stoodEntries(entries, true).map((e) => e.lead)).toEqual(["b"]);
    expect(stoodEntries(entries, false)).toHaveLength(2);
  });
});

describe("a day's rows", () => {
  const install = (
    product: string,
    minute: string,
    extra: Partial<Fact> = {},
  ) =>
    fact("installed", `2026-11-18T12:${minute}:10+00:00`, {
      source: "log",
      product,
      ...extra,
    });

  it("makes one row of mods installed together, and keeps the rest apart", () => {
    const found = rows([
      fact("version-written", noon("2026-11-18")),
      install("A", "14"),
      install("B", "14"),
      install("C", "14"),
      install("D", "20"),
      fact("built", "2026-11-18T12:14:00+00:00", {
        source: "log",
        product: undefined,
      }),
    ]);
    expect(
      found.map((r) =>
        r.kind === "single" ? r.fact.kind : r.facts.map((f) => f.product),
      ),
    ).toEqual(["version-written", ["A", "B", "C"], "installed", "built"]);
  });

  it("makes one commit's settings one row, and a new commit a new row", () => {
    const setting = (
      key: string,
      commit: string,
      kind: Fact["kind"] = "setting-added",
    ) =>
      fact(kind, "2026-11-18T10:00:00+00:00", {
        key,
        commit,
        product: "Boats",
      });
    const found = rows([
      setting("A", "c1"),
      setting("B", "c1", "setting-default"),
      setting("C", "c2"),
      fact("version-written", "2026-11-18T09:00:00+00:00"),
    ]);
    expect(
      found.map((r) =>
        r.kind === "settings" ? [r.commit, r.facts.map((f) => f.key)] : r.kind,
      ),
    ).toEqual([["c1", ["A", "B"]], ["c2", ["C"]], "single"]);
    expect(
      canShowCode({
        ...setting("A", "c1"),
        repository: "boats",
        source: "git",
      }),
    ).toBe(true);
  });

  it("never joins two repositories' installs, or facts from git", () => {
    const found = rows([
      install("A", "14"),
      install("B", "14", { repository: "other" }),
    ]);
    expect(found.map((r) => r.kind)).toEqual(["single", "single"]);
    expect(
      rows([
        fact("entries-added", noon("2026-11-18")),
        fact("entries-added", noon("2026-11-18")),
      ]),
    ).toHaveLength(2);
  });
});

describe("what was running", () => {
  const log = (
    kind: FactKind,
    time: string,
    mod: string,
    version: string,
  ): Fact => ({
    kind,
    time,
    source: "log",
    product: mod,
    mod,
    repository: "repo",
    version,
    changelog: `mods/${mod}/CHANGELOG.md`,
  });

  it("gives each mod's last install or go-back up to the end of the day", () => {
    const facts = [
      log("installed", noon("2026-11-18"), "Boats", "1.2.0"),
      log("installed", noon("2026-11-19"), "Boats", "1.3.0"),
      log("went-back", "2026-11-19T12:30:00+00:00", "Boats", "1.2.0"),
      log("installed", noon("2026-11-18"), "Carts", "0.4.0"),
      log("installed", noon("2026-11-20"), "Lamps", "2.0.0"),
      fact("version-written", noon("2026-11-18"), { version: "9.9.9" }),
    ];
    expect(
      runningOn(facts, "2026-11-18").map((r) => [r.name, r.version]),
    ).toEqual([
      ["Boats", "1.2.0"],
      ["Carts", "0.4.0"],
    ]);
    expect(
      runningOn(facts, "2026-11-19").map((r) => [r.name, r.version]),
    ).toEqual([
      ["Boats", "1.2.0"],
      ["Carts", "0.4.0"],
    ]);
    expect(runningOn(facts, "2026-11-17")).toEqual([]);
  });
});

describe("screenshots on the Timeline (0.32.0)", () => {
  it("gives a day with screenshots and nothing else its place, newest first", () => {
    const fact = {
      kind: "installed",
      time: "2026-11-18T10:00:00Z",
      source: "log",
    } as Fact;
    const days = withShotDays(
      [{ day: "2026-11-18", facts: [fact] }],
      ["2026-11-20", "2026-11-18", "2026-11-01"],
    );
    expect(days.map((d) => d.day)).toEqual([
      "2026-11-20",
      "2026-11-18",
      "2026-11-01",
    ]);
    expect(days[0].facts).toEqual([]);
    expect(days[1].facts).toEqual([fact]);
  });
});
