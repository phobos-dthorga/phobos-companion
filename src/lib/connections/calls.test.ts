import { describe, expect, it } from "vitest";
import {
  arrow,
  callRows,
  callsPicture,
  estimate,
  fitted,
  methodsFor,
  ringPicture,
  ringWords,
} from "./calls";
import type { Call, Calls, CallsMethod } from "./types";

function call(display: string, extra: Partial<Call> = {}): Call {
  return {
    key: `M:${display}`,
    display,
    viaBase: false,
    file: "src/Worker.cs",
    line: 1,
    node: `cs:Phobos.${display}`,
    ...extra,
  };
}

// The shape of phobos-rimworld's stove-bills fix: AvailableReport's calls moved whole into the new Check.
const UNLOCKED = call("Upgrades.Unlocked");
const GAME_REPORT = call("RecipeWorker.AvailableReport", {
  file: undefined,
  node: undefined,
  assembly: "Assembly-CSharp",
  viaBase: true,
});
const CHECK = call("NeedsNode.Check");
const REPORT: CallsMethod = {
  key: "M:Phobos.NeedsNode.AvailableReport",
  id: "M:Phobos.NeedsNode.AvailableReport",
  node: "cs:Phobos.NeedsNode.AvailableReport",
  display: "NeedsNode.AvailableReport",
  file: "src/Worker.cs",
  line: 10,
  end: 20,
  status: "changed",
  gone: [UNLOCKED, GAME_REPORT],
  new: [CHECK],
  kept: [call("Log.Message")],
  movedTo: [
    {
      key: "M:Phobos.NeedsNode.Check",
      display: "NeedsNode.Check",
      calls: [UNLOCKED.key],
    },
  ],
};
const CALLS: Calls = {
  commit: { hash: "5c122faf", subject: "Stove bills" },
  files: [{ before: "src/Worker.cs", after: "src/Worker.cs" }],
  methods: [
    REPORT,
    {
      ...REPORT,
      key: "M:Phobos.NeedsNode.Check",
      node: "cs:Phobos.NeedsNode.Check",
      display: "NeedsNode.Check",
      status: "added",
      gone: [],
      new: [UNLOCKED],
      kept: [],
      movedTo: undefined,
    },
  ],
  rings: { made: [], cut: [], standing: [] },
  game: "rimworld",
  gameRead: ["Assembly-CSharp"],
  seconds: 7,
  limits: [],
};

describe("the methods shown for the thing chosen", () => {
  it("is the method itself, or every method of a type chosen", () => {
    expect(
      methodsFor(CALLS, "cs:Phobos.NeedsNode.AvailableReport").map(
        (m) => m.display,
      ),
    ).toEqual(["NeedsNode.AvailableReport"]);
    expect(methodsFor(CALLS, "cs:Phobos.NeedsNode")).toHaveLength(2);
    expect(methodsFor(CALLS, "cs:Phobos.Need")).toEqual([]);
    expect(methodsFor(CALLS, null)).toEqual([]);
  });
});

describe("one method's calls", () => {
  it("shows gone and new beside kept in the change, and each side alone before and after", () => {
    const change = callRows(REPORT, "change");
    expect(change.map((r) => [r.state, r.display])).toEqual([
      ["gone", "RecipeWorker.AvailableReport"],
      ["gone", "Upgrades.Unlocked"],
      ["new", "NeedsNode.Check"],
      ["kept", "Log.Message"],
    ]);
    expect(callRows(REPORT, "before").map((r) => r.state)).toEqual([
      "gone",
      "gone",
      "kept",
    ]);
    expect(callRows(REPORT, "after").map((r) => r.state)).toEqual([
      "new",
      "kept",
    ]);
  });

  it("says where a call moved, and marks the game's and a call through base", () => {
    const rows = callRows(REPORT, "change");
    expect(rows.find((r) => r.display === "Upgrades.Unlocked")?.movedTo).toBe(
      "NeedsNode.Check",
    );
    const game = rows.find((r) => r.display === "RecipeWorker.AvailableReport");
    expect(game?.outside).toBe(true);
    expect(game?.viaBase).toBe(true);
    expect(game?.assembly).toBe("Assembly-CSharp");
    const added = CALLS.methods[1];
    expect(callRows(added, "change")[0].movedFrom).toBeNull();
  });

  it("is as wide as its method's name and its longest call, never a fixed width (0.83.1)", () => {
    const rows = callRows(REPORT, "change");
    const long =
      "Seen.Note(string, Thing?, string?, string?, IReadOnlyList<KeyValuePair<string, string>>)";
    const wide = callsPicture(
      [{ ...rows[0], display: long }, ...rows.slice(1)],
      {
        label: "Changed(VehiclePawn, RemoteState, RemoteState)",
        notes: ["in Assembly-CSharp", "", "", ""],
      },
    );
    // The box holds its whole name, and every call fits inside the picture.
    expect(wide.label).toBe("Changed(VehiclePawn, RemoteState, RemoteState)");
    expect(wide.full).toBeNull();
    expect(estimate(wide.label, 13, true)).toBeLessThanOrEqual(wide.box.width);
    expect(wide.nameX + estimate(long, 13)).toBeLessThanOrEqual(wide.width);
    expect(wide.rows[0].line.x2).toBeLessThan(wide.wordX);
    expect(wide.wordX + estimate("kept", 12, true)).toBeLessThan(wide.nameX);
    const narrow = callsPicture(rows, { label: "Check()" });
    expect(narrow.width).toBeLessThan(wide.width);
    expect(narrow.box.width).toBeLessThan(wide.box.width);
  });

  it("shortens a name too long for its box: parameters first, then with an ellipsis, the whole name kept", () => {
    const name =
      "AvailableReport(Thing, Pawn, RecipeDef, BillStack, IntVec3, Map, Faction, bool)";
    const picture = callsPicture([], { label: name });
    expect(picture.label).toBe("AvailableReport(…)");
    expect(picture.full).toBe(name);
    expect(fitted("A".repeat(80), 100, 13, true, estimate)).toMatch(/…$/);
    expect(
      estimate(fitted("A".repeat(80), 100, 13, true, estimate), 13, true),
    ).toBeLessThanOrEqual(100);
    expect(fitted("Short", 100, 13, true, estimate)).toBe("Short");
  });

  it("draws a line from the method's box to every row, and grows with its rows", () => {
    const picture = callsPicture(callRows(REPORT, "change"));
    expect(picture.rows).toHaveLength(4);
    expect(picture.height).toBeGreaterThanOrEqual(4 * 34);
    for (const row of picture.rows) {
      expect(row.line.x1).toBeGreaterThan(picture.box.x + picture.box.width);
      expect(Math.abs(row.line.y2 - row.y)).toBeLessThan(2);
    }
  });
});

describe("a ring of calls", () => {
  const ring = [
    { key: "a", display: "NeedsNode.AvailableOnNow", outside: false },
    { key: "b", display: "NeedsNode.AvailableReport", outside: false },
    { key: "c", display: "RecipeWorker.AvailableReport", outside: true },
  ];

  it("is drawn round a loop, an arrow from each step to the next and the last back to the first", () => {
    const picture = ringPicture(ring, new Set(["a"]));
    expect(picture.arrows).toHaveLength(3);
    expect(picture.steps[0].changed).toBe(true);
    expect(picture.steps[0].anchor).toBe("middle");
    expect(picture.steps[0].y).toBeLessThan(picture.height / 2);
    expect(picture.loop).toBeNull();
    const back = picture.arrows[2];
    const first = picture.steps[0];
    expect(Math.hypot(back.x2 - first.x, back.y2 - first.y)).toBeCloseTo(13, 0);
  });

  it("is widened until every step's name fits, and keeps its loop in the middle (0.83.1)", () => {
    const picture = ringPicture(ring, new Set(), { gameWord: "the game's" });
    expect(picture.cx).toBe(picture.width / 2);
    for (const step of picture.steps) {
      const wide = estimate(step.label, 13);
      const left =
        step.anchor === "start"
          ? step.labelX
          : step.anchor === "end"
            ? step.labelX - wide
            : step.labelX - wide / 2;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + wide).toBeLessThanOrEqual(picture.width);
    }
    expect(picture.steps[2].label).toBe(
      "RecipeWorker.AvailableReport (the game's)",
    );
    const longer = ringPicture(
      [
        ...ring.slice(0, 2),
        { ...ring[2], display: `${ring[2].display}WithAVeryLongName` },
      ],
      new Set(),
    );
    expect(longer.width).toBeGreaterThan(ringPicture(ring, new Set()).width);
  });

  it("loops a ring of one step back into itself", () => {
    const picture = ringPicture([ring[0]], new Set());
    expect(picture.arrows).toEqual([]);
    expect(picture.loop).toMatch(/^M /);
  });

  it("reads in words from its first step round and back, the game's marked", () => {
    expect(ringWords(ring, "the game's")).toBe(
      "NeedsNode.AvailableOnNow → NeedsNode.AvailableReport → RecipeWorker.AvailableReport (the game's) → NeedsNode.AvailableOnNow",
    );
  });

  it("stops an arrow short of both ends", () => {
    const line = arrow(0, 0, 100, 0, 10);
    expect([line.x1, line.x2]).toEqual([10, 90]);
    expect(line.head.split(" ")[0]).toBe("90,0");
  });
});
