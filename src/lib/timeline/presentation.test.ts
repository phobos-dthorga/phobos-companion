import { describe, expect, it } from "vitest";
import {
  byDay,
  canReadAsItStood,
  canShowCode,
  dayOf,
  KIND_LOOKS,
  lanes,
  monthStarts,
  showingFilter,
  stoodEntries,
  unlisted,
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
