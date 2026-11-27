import { describe, expect, it } from "vitest";
import {
  begin,
  idsOf,
  marks,
  moveBy,
  offKeys,
  placeBeside,
  placeBlock,
  range,
  summary,
  switchOff,
  switchOn,
  throwAway,
  undo,
  unsaved,
} from "./draft";
import type { ModRow, ModsListing } from "./types";

function mod(key: string, more: Partial<ModRow> = {}): ModRow {
  return {
    key,
    id: key,
    name: key[0]!.toUpperCase() + key.slice(1),
    source: "workshop",
    workshop_id: "",
    authors: "",
    versions: [],
    needs: [],
    ...more,
  };
}

const MODS = [
  mod("core", { source: "game" }),
  mod("lib"),
  mod("needy", { need_ids: [["lib"]] }),
  mod("late", { load_after: ["needy"] }),
  mod("rival", { incompatible: ["needy"] }),
  mod("spare"),
];
const LISTING: ModsListing = {
  game: "g",
  name: "G",
  supported: true,
  version: "1.7",
  mods: MODS,
  lists: [
    {
      key: "active",
      label: "Active",
      writable: true,
      count: 3,
      entries: ["core", "lib", "needy"].map((k) => ({
        id: k.toUpperCase(),
        key: k,
        remembered: "",
      })),
    },
  ],
  running: [],
  notes: [],
  changes: {},
};
const BY = new Map(MODS.map((m) => [m.key, m]));

describe("a list being edited before Save (0.108.0)", () => {
  it("begins as read, with nothing unsaved", () => {
    const draft = begin(LISTING, "active");
    expect(draft.order).toEqual(["core", "lib", "needy"]);
    expect(unsaved(draft)).toBe(false);
    expect(summary(draft)).toEqual({ on: [], off: [], moved: 0 });
  });

  it("switches a mod on just before the first that needs it, else at the end", () => {
    let draft = switchOff(begin(LISTING, "active"), ["lib"]);
    draft = switchOn(draft, ["lib"], BY);
    expect(draft.order).toEqual(["core", "lib", "needy"]);
    draft = switchOn(draft, ["spare"], BY);
    expect(draft.order.at(-1)).toBe("spare");
    expect(summary(draft)).toEqual({ on: ["spare"], off: [], moved: 0 });
  });

  it("moves a chosen block by steps and to either end, and Undo walks back", () => {
    let draft = begin(LISTING, "active");
    draft = moveBy(draft, ["needy"], -1);
    expect(draft.order).toEqual(["core", "needy", "lib"]);
    draft = moveBy(draft, ["core", "lib"], Infinity);
    expect(draft.order).toEqual(["needy", "core", "lib"]);
    expect(summary(draft).moved).toBe(3);
    draft = undo(undo(draft));
    expect(draft.order).toEqual(["core", "lib", "needy"]);
    expect(undo(draft)).toBe(draft);
  });

  it("puts a block beside another mod, bringing in one switched off (a drop)", () => {
    let draft = placeBeside(begin(LISTING, "active"), ["spare"], "lib", false);
    expect(draft.order).toEqual(["core", "spare", "lib", "needy"]);
    draft = undo(draft);
    expect(draft.order).toEqual(["core", "lib", "needy"]);
    expect(placeBlock(draft, ["needy"], 1).order).toEqual([
      "needy",
      "core",
      "lib",
    ]);
  });

  it("throwing away is one step Undo can take back", () => {
    const moved = moveBy(begin(LISTING, "active"), ["needy"], -2);
    const thrown = throwAway(moved);
    expect(unsaved(thrown)).toBe(false);
    expect(undo(thrown).order).toEqual(moved.order);
  });

  it("warns, as the draft stands, of a need that is off, a wrong place, and a mod refused", () => {
    let draft = switchOff(begin(LISTING, "active"), ["lib"]);
    expect(marks(draft, BY).get("needy")).toEqual([
      { kind: "needs", other: "lib" },
    ]);
    draft = switchOn(draft, ["late", "rival"], BY);
    draft = placeBlock(draft, ["late"], 1);
    const found = marks(draft, BY);
    expect(found.get("late")).toEqual([{ kind: "after", other: "Needy" }]);
    expect(found.get("rival")).toEqual([{ kind: "refuses", other: "Needy" }]);
  });

  it("names a mod whose files are not here, sends the list's own ids, and lists the rest by name", () => {
    const draft = { ...begin(LISTING, "active"), order: ["core", "gone"] };
    expect(marks(draft, BY).get("gone")).toEqual([
      { kind: "absent", other: "" },
    ]);
    expect(idsOf(["core", "spare"], LISTING, "active")).toEqual([
      "CORE",
      "spare",
    ]);
    expect(offKeys(begin(LISTING, "active"), LISTING)).toEqual([
      "late",
      "rival",
      "spare",
    ]);
    expect(range(["a", "b", "c", "d"], "c", "a")).toEqual(["a", "b", "c"]);
  });
});
