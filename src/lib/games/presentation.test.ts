import { describe, expect, it } from "vitest";
import { idFor, idProblem, offered, preview } from "./presentation";
import type { SteamGame } from "./types";

const game = (name: string, listedAs: string | null = null): SteamGame => ({
  appId: 1,
  name,
  install: "",
  sizeOnDisk: null,
  lastPlayed: null,
  listedAs,
});

describe("adding a game from Steam", () => {
  it("makes a short id from a game's name, as the list writes them", () => {
    expect(idFor("Farming Simulator 25")).toBe("farming-simulator-25");
    expect(idFor("Workers & Resources: Soviet Republic")).toBe(
      "workers-and-resources-soviet-republic",
    );
    expect(idFor("WORKS: Motorsport Factory")).toBe("works-motorsport-factory");
    expect(idFor("A".repeat(60)).length).toBe(40);
  });

  it("says why an id cannot be taken", () => {
    expect(idProblem("barotrauma", ["rimworld"])).toBeNull();
    expect(idProblem("rimworld", ["rimworld"])).toBe("taken");
    expect(idProblem("Bad Id", [])).toBe("shape");
    expect(idProblem("-start", [])).toBe("shape");
  });

  it("offers the games not on the list first, Steam's own tools last", () => {
    const names = offered([
      game("Steamworks Common Redistributables"),
      game("RimWorld", "rimworld"),
      game("Barotrauma"),
    ]).map((g) => g.name);
    expect(names).toEqual([
      "Barotrauma",
      "RimWorld",
      "Steamworks Common Redistributables",
    ]);
  });

  it("shows the entry as it will be written, leaving out what was not chosen", () => {
    const shown = JSON.parse(
      preview({
        id: "barotrauma",
        name: " Barotrauma ",
        steam_app_id: 602960,
        data: "C:\\Users\\you\\AppData\\Local\\Daedalic Entertainment GmbH\\Barotrauma",
        repositories: [],
      }),
    );
    expect(Object.keys(shown)).toEqual([
      "id",
      "name",
      "repositories",
      "steam_app_id",
      "places",
    ]);
    expect(shown.name).toBe("Barotrauma");
    const bare = JSON.parse(
      preview({
        id: "x",
        name: "X",
        steam_app_id: null,
        data: null,
        repositories: [],
      }),
    );
    expect(bare.places).toBeUndefined();
    expect(bare.steam_app_id).toBeUndefined();
  });
});
