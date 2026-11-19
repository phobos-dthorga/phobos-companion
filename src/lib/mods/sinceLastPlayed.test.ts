import { describe, expect, it } from "vitest";
import type { PatchTarget } from "../connections/patches";
import type { GameFiles } from "../gamefiles/types";
import type { KeptFile } from "../othercode/types";
import {
  GAME_FILE,
  keptTime,
  notKeptYet,
  patchedSince,
  summarise,
  tiedUpdates,
} from "./sinceLastPlayed";

const SINCE = "2026-11-19T00:00:00+00:00";

function files(
  titles: string[],
  extra: Partial<GameFiles["changed"]> = {},
): GameFiles {
  return {
    name: "Sample",
    game: null,
    places: { data: null, saves: null, screenshots: [] },
    changed: {
      since: SINCE,
      sinceLastPlayed: true,
      gameUpdated: false,
      workshop: titles.map((title, index) => ({
        id: String(index),
        title,
        bytes: 1,
        updated: 1,
        updatedAt: SINCE,
      })),
      workshopCount: titles.length,
      workshopInstalled: 40,
      ...extra,
    },
  } as unknown as GameFiles;
}

function kept(owner_name: string, file: string, newest: string): KeptFile {
  return {
    owner: owner_name.toLowerCase(),
    owner_name,
    file,
    versions: 2,
    newest_version: null,
    newest_seen: newest,
    previous_seen: null,
  };
}

function target(
  name: string,
  mod: string,
  file: string,
  newestKept: string,
): PatchTarget {
  return {
    node: `cs:${name}`,
    target: name,
    name,
    assembly: null,
    ours: [],
    mods: [],
    skippers: 0,
    changed: [
      { mod, file, versions: "a to b", change: "new body", newestKept },
    ],
  };
}

describe("since you last played", () => {
  it("compares with the launch before while the game runs, and says when that is not known yet", () => {
    expect(summarise(files([], { sincePrevious: true }), true)).toMatchObject({
      sincePrevious: true,
      thisLaunchOnly: false,
    });
    expect(summarise(files([]), true).thisLaunchOnly).toBe(true);
    expect(summarise(files([]), false).thisLaunchOnly).toBe(false);
  });

  it("finds the updated mods ours tie into by name, and the game's own file when the game updated", () => {
    const archive = [
      kept(
        "Vanilla Furniture Expanded - Factory",
        "VFEF.dll",
        "2026-11-19 09:08 UTC",
      ),
      kept("Something Else", "Else.dll", "2026-11-19 09:08 UTC"),
      kept("RimWorld", GAME_FILE, "2026-11-18 03:13 UTC"),
    ];
    const summary = summarise(
      files(["vanilla furniture expanded - factory", "A Style Pack"], {
        gameUpdated: true,
      }),
      false,
    );
    const tied = tiedUpdates(archive, summary);
    expect(tied.map((f) => f.file)).toEqual(["VFEF.dll", GAME_FILE]);
    expect(notKeptYet(tied, SINCE).map((f) => f.file)).toEqual([GAME_FILE]);
  });

  it("counts a change to a method ours patch only from a build kept since, and from an update since", () => {
    const summary = summarise(
      files(["Vanilla Furniture Expanded - Factory"]),
      false,
    );
    const found = patchedSince(
      [
        target(
          "Building_Conveyor.Tick",
          "Vanilla Furniture Expanded - Factory",
          "VFEF.dll",
          "2026-11-19T09:08:00+00:00",
        ),
        target(
          "Building_Conveyor.PeriodicCacheCheck",
          "Vanilla Furniture Expanded - Factory",
          "VFEF.dll",
          "2026-11-19T09:08:00+00:00",
        ),
        target(
          "Older.Change",
          "Vanilla Furniture Expanded - Factory",
          "VFEF.dll",
          "2026-11-17T09:08:00+00:00",
        ),
        target(
          "Not.Updated",
          "Some Other Mod",
          "Other.dll",
          "2026-11-19T09:08:00+00:00",
        ),
      ],
      summary,
    );
    expect(found).toEqual([
      {
        mod: "Vanilla Furniture Expanded - Factory",
        file: "VFEF.dll",
        methods: [
          "Building_Conveyor.Tick",
          "Building_Conveyor.PeriodicCacheCheck",
        ],
      },
    ]);
  });

  it("reads the archive's times", () => {
    expect(keptTime("2026-11-19 09:08 UTC")).toBe(
      Date.parse("2026-11-19T09:08:00Z"),
    );
    expect(keptTime("whenever")).toBeNull();
  });
});
