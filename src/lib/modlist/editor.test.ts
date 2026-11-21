import { describe, expect, it } from "vitest";
import {
  CARRY_STEPS,
  blockPlace,
  fits,
  matching,
  nameOf,
  nudged,
  offRows,
  onRows,
  placeBeside,
  placeFrom,
  toggled,
  withBlockAt,
  withList,
} from "./editor";
import type { ModRow, ModsListing } from "./types";

function mod(key: string, name: string, extra: Partial<ModRow> = {}): ModRow {
  return {
    key,
    id: key,
    name,
    source: "workshop",
    workshop_id: "",
    authors: "Someone",
    versions: ["1.7"],
    needs: [],
    ...extra,
  };
}

function listing(): ModsListing {
  return {
    game: "rimworld",
    name: "RimWorld",
    supported: true,
    version: "1.7",
    mods: [
      mod("ludeon.rimworld", "Core", { source: "game" }),
      mod("example.inn", "Inn"),
      mod("example.zoo", "Zoo"),
      mod("example.apiary", "Apiary", { source: "local" }),
    ],
    lists: [
      {
        key: "active",
        label: "Your active mods",
        writable: true,
        count: 3,
        entries: [
          { id: "ludeon.rimworld", key: "ludeon.rimworld", remembered: "" },
          { id: "example.inn", key: "example.inn", remembered: "" },
          {
            id: "example.gone_steam",
            key: "example.gone",
            remembered: "Gone Mod",
          },
        ],
      },
    ],
    running: [],
    notes: [],
    changes: { active: 0 },
  };
}

describe("Edit the list", () => {
  it("shows the list in order, a mod not here by the name a check remembered", () => {
    const rows = onRows(listing(), "active");
    expect(rows.map((r) => r.place)).toEqual([1, 2, 3]);
    expect(rows[2].mod).toBeNull();
    expect(nameOf(rows[2])).toBe("Gone Mod");
  });

  it("lists the switched-off mods by name", () => {
    expect(offRows(listing(), "active").map((m) => m.name)).toEqual([
      "Apiary",
      "Zoo",
    ]);
  });

  it("searches names, ids and authors, and filters by where a mod comes from", () => {
    const zoo = listing().mods[2];
    expect(fits(zoo, zoo.name, "zo", "all")).toBe(true);
    expect(fits(zoo, zoo.name, "EXAMPLE.ZOO", "all")).toBe(true);
    expect(fits(zoo, zoo.name, "someone", "workshop")).toBe(true);
    expect(fits(zoo, zoo.name, "", "local")).toBe(false);
    expect(fits(null, "Gone Mod", "gone", "all")).toBe(true);
    expect(fits(null, "Gone Mod", "", "workshop")).toBe(false);
  });

  it("takes a typed place only when it is on the list", () => {
    expect(placeFrom(" 2 ", 3)).toBe(2);
    expect(placeFrom("0", 3)).toBeNull();
    expect(placeFrom("4", 3)).toBeNull();
    expect(placeFrom("1.5", 3)).toBeNull();
    expect(placeFrom("two", 3)).toBeNull();
  });

  it("takes the list a change left, keeping remembered names and counting what can be undone", () => {
    const after = withList(
      listing(),
      "active",
      ["example.gone_steam", "ludeon.rimworld"],
      ["example.gone", "ludeon.rimworld"],
      1,
    );
    expect(after.lists[0].entries.map((e) => e.key)).toEqual([
      "example.gone",
      "ludeon.rimworld",
    ]);
    expect(after.lists[0].entries[0].remembered).toBe("Gone Mod");
    expect(after.lists[0].count).toBe(2);
    expect(after.changes.active).toBe(1);
    expect(withList(after, "active", [], [], -1).changes.active).toBe(0);
  });
});

describe("moving several mods freely (0.47.0)", () => {
  const keys = ["a", "b", "c", "d", "e"];

  it("puts a block at a place counted without it, in list order", () => {
    expect(withBlockAt(keys, new Set(["d", "b"]), 1)).toEqual([
      "b",
      "d",
      "a",
      "c",
      "e",
    ]);
    expect(withBlockAt(keys, new Set(["a"]), 99)).toEqual([
      "b",
      "c",
      "d",
      "e",
      "a",
    ]);
  });

  it("knows where a block starts and where beside a mod puts it", () => {
    const chosen = new Set(["c", "d"]);
    expect(blockPlace(keys, chosen)).toBe(3);
    expect(placeBeside(keys, chosen, "a", true)).toBe(2);
    expect(placeBeside(keys, chosen, "e", false)).toBe(3);
    expect(placeBeside(keys, chosen, "c", true)).toBeNull();
    expect(placeBeside(keys, chosen, "zz", true)).toBeNull();
    expect(
      withBlockAt(keys, chosen, placeBeside(keys, chosen, "a", false) ?? 0),
    ).toEqual(["c", "d", "a", "b", "e"]);
  });

  it("carries a block one place, ten, or to either end, never past them", () => {
    expect(nudged(3, CARRY_STEPS.ArrowUp, 4)).toBe(2);
    expect(nudged(3, CARRY_STEPS.PageDown, 4)).toBe(5);
    expect(nudged(3, CARRY_STEPS.Home, 4)).toBe(1);
    expect(nudged(1, CARRY_STEPS.ArrowUp, 4)).toBe(1);
  });

  it("offers names that start with the words first, then names and ids that hold them", () => {
    const mods = [
      { key: "x", name: "Vanilla Furniture", id: "vfe.furniture" },
      { key: "y", name: "Furniture Plus", id: "f.plus" },
      { key: "z", name: "Other", id: "someone.furniture.patch" },
    ];
    expect(matching(mods, "furn").map((m) => m.key)).toEqual(["y", "x", "z"]);
    expect(matching(mods, "  ")).toEqual([]);
    expect(matching(mods, "furn", 1).map((m) => m.key)).toEqual(["y"]);
  });

  it("chooses and lets go in the order chosen", () => {
    expect(toggled(["a"], "b")).toEqual(["a", "b"]);
    expect(toggled(["a", "b"], "a")).toEqual(["b"]);
  });
});
