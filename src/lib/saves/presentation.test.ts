import { describe, expect, it } from "vitest";
import { childrenOf, lastName, partWords, stepsTo } from "./presentation";

describe("the Save explorer's parts", () => {
  const parts = [
    { path: "savegame", count: 1 },
    { path: "savegame/game", count: 1 },
    { path: "savegame/meta", count: 1 },
    { path: "savegame/game/maps", count: 1 },
  ];

  it("lists one level below a place, the place itself left out", () => {
    expect(childrenOf(parts, null).map((p) => p.path)).toEqual(["savegame"]);
    expect(childrenOf(parts, "savegame").map((p) => p.path)).toEqual([
      "savegame/game",
      "savegame/meta",
    ]);
    expect(childrenOf(parts, "savegame/game").map((p) => p.path)).toEqual([
      "savegame/game/maps",
    ]);
  });

  it("names each step to a place, and a list item as an item", () => {
    expect(stepsTo("savegame/game/maps")).toEqual([
      { path: "savegame", name: "savegame" },
      { path: "savegame/game", name: "game" },
      { path: "savegame/game/maps", name: "maps" },
    ]);
    expect(stepsTo(null)).toEqual([]);
    expect(lastName("savegame/game/maps/li")).toBe("li");
    expect(partWords("li")).toBe("item");
    expect(partWords("maps")).toBe("maps");
  });
});
