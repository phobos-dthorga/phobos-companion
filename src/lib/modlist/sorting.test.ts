import { describe, expect, it } from "vitest";
import { movedBy, namesOf } from "./sorting";
import type { ModsListing } from "./types";

describe("the sort's words (0.47.0)", () => {
  it("says which way a mod moves and how far", () => {
    const move = { key: "a", name: "A", why: [], sources: [] };
    expect(movedBy({ ...move, from: 13, to: 11 })).toEqual({
      direction: "up",
      places: 2,
    });
    expect(movedBy({ ...move, from: 2, to: 9 })).toEqual({
      direction: "down",
      places: 7,
    });
  });

  it("names a rule's mods by id or key, whatever their case", () => {
    const listing = {
      mods: [
        {
          key: "brrainz.harmony",
          id: "brrainz.harmony",
          name: "Harmony",
        },
        {
          key: "ilyvion.loadingprogress",
          id: "ilyvion.LoadingProgress",
          name: "Loading Progress",
        },
      ],
    } as unknown as ModsListing;
    const names = namesOf(listing);
    expect(names.get("ilyvion.loadingprogress")).toBe("Loading Progress");
    expect(names.get("brrainz.harmony")).toBe("Harmony");
  });
});
