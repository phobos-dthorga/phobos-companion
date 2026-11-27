import { describe, expect, it } from "vitest";
import {
  fromActions,
  fromAddress,
  fromChanges,
  fromCode,
  fromCommits,
  fromGuide,
  fromLookUp,
  fromMods,
  fromPages,
  fromTabs,
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

  it("lists each tab of a page as a place of its own (0.66.0)", () => {
    const tabs = fromTabs(
      "sample",
      (p) => p,
      (key) => key,
    );
    expect(
      tabs.find((c) => c.label === "settings › settings-tab-folders")?.place,
    ).toEqual(place("settings", "sample", { tab: "folders" }));
    expect(tabs.every((c) => c.kind === "page")).toBe(true);
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

  it("offers a thing to do as the page where it is done, never doing it", () => {
    const found = fromActions("sample", [
      {
        label: "Look inside the running game",
        detail: "Explorer",
        page: "explorer",
        focus: { start: "yes" },
      },
    ]);
    expect(rank(found, "look inside").map((c) => c.place)).toEqual([
      place("explorer", "sample", { start: "yes" }),
    ]);
    expect(rank(found, "")).toEqual([]);
  });
});

describe("the search across everything (0.110.0)", () => {
  it("finds a mod by its name or id, opening the Mod list's editor on it", () => {
    const found = rank(
      fromMods(
        "first",
        [
          {
            key: "smashphil.vehicleframework",
            id: "SmashPhil.VehicleFramework",
            name: "Vehicle Framework",
            authors: "Smash Phil",
          },
        ],
        (m) => m.id,
      ),
      "smashphil",
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.place.page).toBe("modlist");
    expect(found[0]?.place.focus).toEqual({
      view: "edit",
      mod: "smashphil.vehicleframework",
    });
  });

  it("offers to look up anything shaped like a definition's name, and nothing else", () => {
    const words = (name: string) => `Look up ${name}`;
    const found = rank(
      fromLookUp("first", "C17_Globemaster", words),
      "C17_Globemaster",
    );
    expect(found[0]?.place.focus).toEqual({
      tab: "lookup",
      name: "C17_Globemaster",
      look: "who",
    });
    expect(fromLookUp("first", "two words", words)).toEqual([]);
    expect(fromLookUp(null, "Steel", words)).toEqual([]);
  });

  it("finds a commit by its words or hash, opening its code", () => {
    const found = rank(
      fromCommits("first", "first-mods", [
        {
          hash: "a1b2c3d4e5f6",
          time: "2026-11-27T09:00:00Z",
          subject: "Save writes the whole list",
        },
      ]),
      "a1b2c3",
    );
    expect(found[0]?.kind).toBe("commit");
    expect(found[0]?.place.dialog?.kind).toBe("code");
  });

  it("finds a Guide entry by words in its text, not only its title", () => {
    const found = rank(
      fromGuide(
        null,
        [
          {
            id: "task-x",
            title: "Edit the list",
            words: [],
            kind: "task",
            text: "Press Ctrl + S to save the whole list.",
          },
        ],
        () => "How do I",
      ),
      "whole list",
    );
    expect(found.map((c) => c.label)).toEqual(["Edit the list"]);
  });
});
