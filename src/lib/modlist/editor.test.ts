import { describe, expect, it } from "vitest";
import { fits, nameOf, offRows, onRows, placeFrom, withList } from "./editor";
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
