import { describe, expect, it } from "vitest";
import type { PatchTarget } from "../connections/patches";
import type { GameFiles } from "../gamefiles/types";
import type { KeptFile } from "../othercode/types";
import {
  compareFrom,
  FIRST_REACH_DAYS,
  GAME_FILE,
  kitMoment,
  keptTime,
  newTypes,
  notKeptYet,
  patchedSince,
  summarise,
  summariseCheck,
  tiedUpdates,
  updateSize,
  type UpdateRow,
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

describe("an update stays listed until it is checked (0.42.1)", () => {
  // The owner's morning: Harrier updated at 09:15, the game was launched at 14:00, and no check was made in between.
  const NOW = new Date("2026-11-21T22:00:00Z");
  const UPDATED = Date.parse("2026-11-21T09:15:00Z");
  const LAUNCH = "2026-11-21T14:00:00+00:00";
  const listed = (since: string) => UPDATED > Date.parse(since);

  it("an update before the last launch but after the last check stays listed", () => {
    const from = compareFrom(LAUNCH, "2026-11-20T20:00:00.000Z", NOW);
    expect(from).toEqual({
      since: "2026-11-20T20:00:00+00:00",
      reach: "check",
    });
    expect(listed(from.since)).toBe(true);
  });

  it("after a check it goes, and the last launch is compared with again", () => {
    const from = compareFrom(LAUNCH, "2026-11-21T15:00:00.000Z", NOW);
    expect(from).toEqual({ since: LAUNCH, reach: "launch" });
    expect(listed(from.since)).toBe(false);
  });

  it("with no check yet it reaches back a week, unless the last launch is earlier still", () => {
    const from = compareFrom(LAUNCH, null, NOW);
    expect(from.reach).toBe("week");
    expect(Date.parse(from.since)).toBe(
      NOW.getTime() - FIRST_REACH_DAYS * 86_400_000,
    );
    expect(listed(from.since)).toBe(true);
    const longAgo = "2026-11-01T00:00:00+00:00";
    expect(compareFrom(longAgo, null, NOW)).toEqual({
      since: longAgo,
      reach: "launch",
    });
  });

  it("a launch it cannot read, or a check it cannot read, falls back safely", () => {
    expect(compareFrom("", null, NOW).reach).toBe("week");
    expect(compareFrom(LAUNCH, "not a time", NOW).reach).toBe("week");
  });

  it("sends the kit a moment every Python it supports reads", () => {
    expect(kitMoment(Date.parse("2026-11-21T09:15:30.750Z"))).toBe(
      "2026-11-21T09:15:30+00:00",
    );
  });
});

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

describe("the check after an update", () => {
  const update = (mod: string, added: number, bodies = 0): UpdateRow => ({
    mod,
    file: `${mod}.dll`,
    added,
    removed: 0,
    signatures: 0,
    bodies,
    newTypes: added ? ["PilotLoss", "CrashDust"] : [],
    newTypeCount: added ? 4 : 0,
  });

  it("keeps what needs reading and drops what does not", () => {
    const summary = summariseCheck({
      since: "2026-11-19 00:00",
      names: { found: 622, failing: [], notChecked: 0, atRunTime: 44 },
      temporary: [
        {
          row: 12,
          patch: "ConveyorTickPatch",
          mod: "Factory",
          file: "F.dll",
          status: "changed",
          detail: "Tick changed",
        },
        {
          row: 5,
          patch: "RimPactsArrivalFilter",
          mod: "RimPacts",
          file: "R.dll",
          status: "unchanged",
          detail: "",
        },
        {
          row: 7,
          patch: "Spread",
          mod: "IRBM",
          file: "I.dll",
          status: "one-build",
          detail: "",
        },
      ],
      updates: [
        update("Harrier", 246),
        update("Game", 0),
        update("Factory", 0, 46),
      ],
      xml: {
        checked: 371,
        rows: [
          { mod: "Ours", file: "a.xml", def: "A", status: "found", detail: "" },
          {
            mod: "Ours",
            file: "b.xml",
            def: "B",
            status: "patched",
            detail: "",
          },
          {
            mod: "Ours",
            file: "c.xml",
            def: "C",
            status: "missing",
            detail: "gone",
          },
        ],
      },
    });
    expect(summary.names).toEqual({ found: 622, failing: [] });
    expect(summary.temporary?.touched.map((r) => r.row)).toEqual([12]);
    expect(summary.temporary?.total).toBe(3);
    expect(summary.updates?.shown.map((r) => r.mod)).toEqual([
      "Harrier",
      "Factory",
    ]);
    expect(summary.xml).toMatchObject({ checked: 371, patched: 1 });
    expect(summary.xml?.problems.map((r) => r.def)).toEqual(["C"]);
  });

  it("shows a few updates and counts the rest", () => {
    const many = Array.from({ length: 7 }, (_, i) => update(`M${i}`, 1));
    const summary = summariseCheck({ since: "x", updates: many }, 5);
    expect(summary.updates?.shown).toHaveLength(5);
    expect(summary.updates?.more).toBe(2);
    expect(summary.names).toBeNull();
    expect(summary.xml).toBeNull();
  });

  it("names new types with how many more", () => {
    expect(newTypes(update("Harrier", 246))).toBe("PilotLoss, CrashDust +2");
    expect(updateSize(update("Factory", 0, 46))).toBe(46);
  });
});
