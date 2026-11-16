import { describe, expect, it } from "vitest";
import {
  formatDay,
  lastSighting,
  onShelf,
  plainText,
  shelfOf,
  steps,
} from "./presentation";
import type { Sighting, TestRow } from "./types";

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
