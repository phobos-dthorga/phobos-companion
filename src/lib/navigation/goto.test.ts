import { describe, expect, it } from "vitest";
import {
  fromAddress,
  fromChanges,
  fromCode,
  fromPages,
  fromTests,
  rank,
  type Candidate,
} from "./goto";
import { addressOf, PAGE_NAMES, place } from "./place";

const changes = [
  {
    repository: "sample-mods",
    changelogs: [
      {
        changelog: "mods/Boats/CHANGELOG.md",
        product: "Sample Boats",
        versionsInAll: 2,
        versions: [
          {
            version: "1.3.0",
            heading: "2026-11-18 - Draft",
            summary: "Sails",
            entries: [
              {
                version: "1.3.0",
                section: "Added",
                text: "**Sails.** Boats have sails.",
                lead: "Sails.",
                aboutSaves: false,
              },
            ],
          },
        ],
      },
    ],
  },
];

describe("go to anything", () => {
  it("leads a version to its changelog and an entry to its code", () => {
    const found = fromChanges("sample", changes);
    expect(found.map((c) => [c.kind, c.label])).toEqual([
      ["version", "Sample Boats 1.3.0"],
      ["entry", "Sails."],
    ]);
    expect(found[0].place.focus).toEqual({
      repository: "sample-mods",
      changelog: "mods/Boats/CHANGELOG.md",
    });
    expect(found[1].place.dialog?.kind).toBe("code");
  });

  it("leads a test row, a method and a page to their places", () => {
    const tests = fromTests("sample", [
      {
        repository: "sample-mods",
        title: "",
        rows: [
          {
            id: "151",
            section: "Vehicles",
            title: "The **Mongoose** fires",
            status: "open",
            cells: {},
            seen: [],
            evidence_keys: [],
            verdict: null,
            pending: null,
          },
        ],
        unrowed: [],
        order_problems: [],
        command_line: "",
      },
    ]);
    expect(tests[0].label).toBe("151: The Mongoose fires");
    expect(tests[0].place.focus).toEqual({
      repository: "sample-mods",
      row: "151",
    });
    const code = fromCode("sample", "sample-mods", [
      {
        id: "cs:Sample.Boat.Tick",
        name: "Boat.Tick",
        kind: "method",
        language: "csharp",
        file: "src/Boat.cs",
        line: 12,
        end: 20,
        owner: null,
        external: false,
        assembly: null,
      },
    ]);
    expect(code[0].place).toEqual(
      place("codemap", "sample", {
        repository: "sample-mods",
        node: "cs:Sample.Boat.Tick",
      }),
    );
    expect(fromPages("sample", (p) => p)).toHaveLength(PAGE_NAMES.length);
  });

  it("matches every word, best first, a few of each kind", () => {
    const candidates: Candidate[] = [
      ...fromChanges("sample", changes),
      ...fromPages("sample", (p) => (p === "timeline" ? "Timeline" : p)),
    ];
    // The version's own summary is "Sails", so it is found too, by its detail.
    expect(rank(candidates, "sails").map((c) => c.label)).toEqual([
      "Sample Boats 1.3.0",
      "Sails.",
    ]);
    expect(rank(candidates, "boats have").map((c) => c.label)).toEqual([]);
    expect(rank(candidates, "boats 1.3").map((c) => c.label)).toEqual([
      "Sample Boats 1.3.0",
      "Sails.",
    ]);
    expect(rank(candidates, "").every((c) => c.kind === "page")).toBe(true);
    expect(rank(candidates, "time").map((c) => c.label)).toEqual(["Timeline"]);
    const many: Candidate[] = Array.from({ length: 20 }, (_, i) => ({
      kind: "test",
      label: `Row ${i}`,
      detail: "",
      place: place("tests"),
    }));
    expect(rank(many, "row")).toHaveLength(8);
  });

  it("opens a pasted address", () => {
    const where = place("codemap", "sample", {
      repository: "sample-mods",
      node: "cs:A.B",
    });
    const found = fromAddress(addressOf(where), "Open this address");
    expect(found[0].place).toEqual(where);
    expect(fromAddress("not an address", "x")).toEqual([]);
    expect(rank(found, addressOf(where))).toHaveLength(1);
  });
});
