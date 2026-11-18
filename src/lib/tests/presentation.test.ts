import { describe, expect, it } from "vitest";
import {
  concerns,
  figures,
  formatDay,
  lastSighting,
  onShelf,
  partsSummary,
  plainText,
  shelfCount,
  shelfOf,
  steps,
} from "./presentation";
import type { PartCheck, Sighting, TestList, TestRow } from "./types";

function part(name: string, extra: Partial<PartCheck> = {}): PartCheck {
  return {
    name,
    state: "none",
    seen: 0,
    expected: [],
    off: [],
    stale: 0,
    stale_version: "",
    ...extra,
  };
}

describe("judged evidence (kit 1.19.0)", () => {
  const offNote = {
    key: "vehicles.grid-hook-up",
    time: "2026-11-18T03:02:35Z",
    mod: "D'thorga Framework",
    version: "0.137.2",
    detail: "M2A3 Bradley: 0 W",
    on: "",
    kind: "",
    variant: "",
    values: { loadsA: 0, W: 0.09 },
  };

  it("sends a row whose notes don't stand as evidence to be looked into", () => {
    const hollow = baseRow({
      parts: [
        part("the turret on the grid", {
          state: "off",
          off: [offNote],
          expected: ["W >= 500", "loadsA >= 20"],
        }),
      ],
    });
    expect(shelfOf(hollow)).toBe("check");
    expect(concerns(hollow)).toEqual([
      {
        kind: "off",
        part: "the turret on the grid",
        saw: "loadsA 0, W 0.09",
        expects: "W >= 500; loadsA >= 20",
      },
    ]);
  });

  it("names a sighting older than its row, and a note out of order", () => {
    const row = baseRow({
      parts: [
        part("a turbine's warning", {
          state: "stale",
          stale_version: "0.129.0",
        }),
      ],
      order_problems: [
        {
          rule: "a turbine warns first",
          row: "69",
          on: "Abrams1",
          kind: "M1A2Abrams",
          time: "t",
          detail: "M1A2 Abrams: too weak to light",
        },
      ],
    });
    expect(concerns(row).map((c) => c.kind)).toEqual(["stale", "order"]);
    expect(concerns(row)[1]).toMatchObject({ on: "M1A2Abrams" });
  });

  it("says which parts were seen and which are still to see", () => {
    const row = baseRow({
      parts: [
        part("tracked", { state: "seen", seen: 2 }),
        part("locked on"),
        part("a missile coming", { state: "expected", seen: 1 }),
      ],
    });
    expect(partsSummary(row)).toEqual({
      seen: ["tracked", "a missile coming"],
      missing: ["locked on"],
      total: 3,
    });
    expect(partsSummary(baseRow({ parts: [part("")] }))).toBeNull();
    expect(partsSummary(baseRow())).toBeNull();
  });

  it("writes figures in name order, and nothing for none", () => {
    expect(figures({ W: 960, chargingA: 4 })).toBe("chargingA 4, W 960");
    expect(figures(undefined)).toBe("");
  });

  it("counts notes no row names as their own shelf", () => {
    const list: TestList = {
      repository: "r",
      title: "",
      rows: [baseRow()],
      unrowed: [
        { key: "a", count: 1, last: "t", detail: "", decision: null, note: "" },
        {
          key: "b",
          count: 2,
          last: "t",
          detail: "",
          decision: "no-row",
          note: "",
        },
      ],
      order_problems: [],
      command_line: "",
    };
    expect(shelfCount([list], "unrowed")).toBe(2);
    expect(shelfCount([list], "waiting")).toBe(1);
  });
});

function baseRow(extra: Partial<TestRow> = {}): TestRow {
  return {
    id: "149",
    section: "",
    title: "The grid runs a parked vehicle",
    status: "open",
    cells: {},
    seen: [],
    evidence_keys: [],
    verdict: null,
    pending: null,
    ...extra,
  };
}

function sighting(last: string, detail = "M1A2"): Sighting {
  return {
    key: "vehicles.field-refit",
    first: last,
    last,
    count: 1,
    mod: "D'thorga Framework",
    version: "0.118.0",
    detail,
  };
}

function row(extra: Partial<TestRow> = {}): TestRow {
  return {
    id: "127",
    section: "The ones that matter",
    title: "Re-fitting a track in the field",
    status: "open",
    cells: {
      "#": "127",
      "What it proves": "**Re-fitting a track** (Framework 0.116.0)",
      "What to do": "Destroy a track, press **Field repairs**",
      "What passes": "A mechanic re-fits it to 25% \\| slowly",
    },
    seen: [],
    evidence_keys: ["vehicles.field-refit"],
    verdict: null,
    pending: null,
    ...extra,
  };
}

describe("shelves", () => {
  it("puts a row the game has seen working first", () => {
    expect(shelfOf(row({ seen: [sighting("2026-11-17T10:00:00Z")] }))).toBe(
      "seen",
    );
  });

  it("puts your own verdict above everything the test list says", () => {
    const judged = row({
      status: "passed",
      verdict: { verdict: "failed", time: "t", note: "" },
      pending:
        "**Failed: the owner, 17 Nov 2026, through D'thorga Companion.**",
    });
    expect(shelfOf(judged)).toBe("judged");
  });

  it("moves a verdict the test list already holds to done", () => {
    const written = row({
      status: "passed",
      verdict: { verdict: "passed", time: "t", note: "" },
      pending: null,
    });
    expect(shelfOf(written)).toBe("done");
  });

  it("leaves a passed or failed row on the done shelf", () => {
    expect(shelfOf(row({ status: "passed" }))).toBe("done");
    expect(shelfOf(row({ status: "failed" }))).toBe("done");
  });

  it("keeps a row passed in part waiting", () => {
    expect(shelfOf(row({ status: "partial" }))).toBe("waiting");
  });

  it("keeps the test list's order on a shelf", () => {
    const rows = [
      row({ id: "2" }),
      row({ id: "1", status: "passed" }),
      row({ id: "3" }),
    ];
    expect(onShelf(rows, "waiting").map((r) => r.id)).toEqual(["2", "3"]);
  });
});

describe("words", () => {
  it("shows Markdown as plain words", () => {
    expect(plainText("**Bold** and `code` and [a link](x.md) a \\| b")).toBe(
      "Bold and code and a link a | b",
    );
  });

  it("reads what to do and what passes by position", () => {
    expect(steps(row())).toEqual({
      todo: "Destroy a track, press Field repairs",
      passes: "A mechanic re-fits it to 25% | slowly",
    });
  });

  it("formats a day and leaves anything else as it is", () => {
    expect(formatDay("not a time")).toBe("not a time");
    expect(formatDay("2026-11-17T12:00:00Z")).toMatch(/2026/);
  });

  it("finds the latest sighting", () => {
    const r = row({
      seen: [
        sighting("2026-11-16T10:00:00Z", "old"),
        sighting("2026-11-17T10:00:00Z", "new"),
      ],
    });
    expect(lastSighting(r)?.detail).toBe("new");
    expect(lastSighting(row())).toBeNull();
  });
});
