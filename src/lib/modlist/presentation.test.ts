import { describe, expect, it } from "vitest";
import {
  findingsByList,
  lastChange,
  stampMoment,
  steamWorthy,
  worthMentioning,
} from "./presentation";
import type { ModListCheck, ModProblem } from "./types";

function problem(extra: Partial<ModProblem>): ModProblem {
  return {
    kind: "missing",
    severity: "problem",
    list_key: "active",
    id: "example.gone",
    name: "Gone",
    title: "Gone is switched on, but it is not on this PC.",
    why: "",
    clue: "",
    needed_by: [],
    fixes: [],
    workshop_id: "",
    ...extra,
  };
}

function check(extra: Partial<ModListCheck> = {}): ModListCheck {
  return {
    game: "rimworld",
    name: "RimWorld",
    supported: true,
    version: "1.7",
    online: true,
    notes: [],
    installed: 3,
    running: [],
    lists: [
      {
        key: "active",
        label: "Your active mods",
        path: "/c/ModsConfig.xml",
        count: 3,
        writable: true,
      },
    ],
    problems: [],
    counts: { problem: 0, warning: 0, note: 0 },
    backups: [],
    ...extra,
  };
}

describe("the mod list page", () => {
  it("groups findings by list and severity, with the version notes apart", () => {
    const found = findingsByList(
      check({
        problems: [
          problem({}),
          problem({ kind: "order", severity: "warning" }),
          problem({ kind: "version", severity: "note" }),
          problem({ kind: "unchecked", severity: "note" }),
          problem({ list_key: "other" }),
        ],
      }),
    );
    expect(found).toHaveLength(1);
    expect(found[0].bySeverity.problem).toHaveLength(1);
    expect(found[0].bySeverity.warning).toHaveLength(1);
    expect(found[0].bySeverity.note.map((p) => p.kind)).toEqual(["unchecked"]);
    expect(found[0].versions).toHaveLength(1);
  });

  it("offers Steam only for a Workshop item that went or is needed", () => {
    expect(steamWorthy(problem({ workshop_id: "123456789" }))).toBe(true);
    expect(steamWorthy(problem({ workshop_id: "" }))).toBe(false);
    expect(
      steamWorthy(problem({ kind: "version", workshop_id: "123456789" })),
    ).toBe(false);
  });

  it("undoes the latest change, never the copy kept before going back", () => {
    const backups = [
      {
        list: "active",
        why: "before going back",
        at: "20261122T050000Z",
        file: "b",
      },
      {
        list: "active",
        why: "take x off the list",
        at: "20261122T040000Z",
        file: "a",
      },
    ];
    expect(lastChange(check({ backups }), "active")?.file).toBe("a");
    expect(lastChange(check({ backups }), "default")).toBeNull();
  });

  it("mentions problems and warnings on Home, never notes or an unread game", () => {
    expect(worthMentioning(null)).toBeNull();
    expect(
      worthMentioning(check({ counts: { problem: 0, warning: 0, note: 9 } })),
    ).toBeNull();
    expect(
      worthMentioning(check({ counts: { problem: 1, warning: 2, note: 0 } })),
    ).toBe(3);
    expect(
      worthMentioning(
        check({
          supported: false,
          counts: { problem: 1, warning: 0, note: 0 },
        }),
      ),
    ).toBeNull();
  });

  it("reads the kit's stamps", () => {
    expect(stampMoment("20261122T042900Z")).toBe("2026-11-22T04:29:00Z");
    expect(stampMoment("yesterday")).toBeNull();
  });
});
