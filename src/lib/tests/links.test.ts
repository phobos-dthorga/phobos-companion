import { describe, expect, it } from "vitest";
import {
  codeOfRow,
  rowOf,
  rowsWatching,
  waitingOn,
  type CodePlace,
} from "./links";
import type { TestList, TestRow } from "./types";

function place(
  key: string,
  id: string | null,
  rows: string[],
  line = 10,
): CodePlace {
  return {
    key,
    prefix: false,
    file: "src/Boat.cs",
    line,
    thing: id
      ? { id, name: id.split(".").slice(-2).join("."), kind: "method" }
      : null,
    rows,
  };
}

function row(id: string, extra: Partial<TestRow> = {}): TestRow {
  return {
    id,
    section: "Boats",
    title: `Row ${id}`,
    status: "open",
    cells: {},
    seen: [],
    evidence_keys: [],
    verdict: null,
    pending: null,
    ...extra,
  };
}

const places = [
  place("boats.float", "cs:Sample.Boat.Float", ["1"], 7),
  place("boats.float", "cs:Sample.Boat.Float", ["1"], 9),
  place("boats.sink", "cs:Sample.Boat.Sink", ["2", "3"]),
  place("boats.loose", null, ["4"]),
  place("rafts.float", "cs:Sample.Raft.Float", ["5"]),
];

describe("joining test rows to code", () => {
  it("lists the things that note a row, each once", () => {
    expect(codeOfRow(places, "1").map((c) => [c.thing.id, c.line])).toEqual([
      ["cs:Sample.Boat.Float", 7],
    ]);
    expect(codeOfRow(places, "4")).toEqual([]);
  });

  it("finds the rows a method watches, and a type's through its members", () => {
    expect(rowsWatching(places, "cs:Sample.Boat.Sink")).toEqual(["2", "3"]);
    expect(rowsWatching(places, "cs:Sample.Boat")).toEqual(["1", "2", "3"]);
    expect(rowsWatching(places, "cs:Sample.Bo")).toEqual([]);
  });
});

describe("rows waiting on a version", () => {
  const lists: TestList[] = [
    {
      repository: "boats",
      title: "Boats",
      rows: [
        row("1", { versions: { "Sample Boats": "0.3.0" } }),
        row("2", {
          versions: { "Sample Boats": "0.3.0" },
          status: "passed",
        }),
        row("3", { versions: { "Sample Boats": "0.2.0" } }),
        row("4", {
          versions: { "Sample Boats": "0.3.0" },
          verdict: { verdict: "failed", time: "", note: "" },
        }),
      ],
      unrowed: [],
      order_problems: [],
      command_line: "",
    },
  ];

  it("keeps rows of that version with no verdict yet", () => {
    expect(
      waitingOn(lists, "Sample Boats", "0.3.0").map((w) => w.row.id),
    ).toEqual(["1"]);
    expect(waitingOn(lists, "Other", "0.3.0")).toEqual([]);
    expect(rowOf(lists, "boats", "3")?.title).toBe("Row 3");
    expect(rowOf(lists, "rafts", "3")).toBeNull();
  });
});
