import { describe, expect, it } from "vitest";
import {
  cellKey,
  checkCounts,
  copyCounts,
  DAILY_TIMES,
  kindKey,
  listKey,
  setName,
  summarise,
  wantsCopy,
} from "./presentation";
import type { RepositoryCopies, SafeSet } from "./types";

describe("a list's key and the daily run's times (0.44.0)", () => {
  it("keeps a repository's own list apart from the game's list it keeps", () => {
    expect(listKey({ repository: "phobos-modkit", list: false })).toBe(
      "phobos-modkit",
    );
    expect(listKey({ repository: "phobos-modkit", list: true })).toBe(
      "phobos-modkit#game",
    );
  });

  it("offers only times of day the host accepts", () => {
    for (const at of DAILY_TIMES)
      expect(at).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
  });
});

function set(
  name: string,
  unit: string | null,
  states: Record<string, SafeSet["destinations"][string]>,
  never = false,
): SafeSet {
  return {
    set: name,
    unit,
    kind: "own",
    why: "",
    files: 1,
    bytes: 10,
    destinations: states,
    neverCopied: never,
  };
}

function repository(sets: SafeSet[]): RepositoryCopies {
  return {
    repository: "repo",
    list: false,
    title: "",
    command_line: "",
    status: { game: "g", notes: [], sets, destinations: [] },
  };
}

const WHEN = "2026-11-21T11:40:29+00:00";

describe("safe copies on Home", () => {
  it("counts sets never copied apart from those changed since their copy", () => {
    const found = summarise([
      repository([
        set("trainings", "ours", {
          local: { state: "copied", lastCopied: WHEN },
        }),
        set("trainings", "new", { local: { state: "never copied" } }, true),
        set("notes", null, {
          local: { state: "changed since", lastCopied: WHEN, changed: 2 },
        }),
      ]),
    ]);
    expect(found).toEqual({ never: 1, changed: 1, sets: 3 });
  });

  it("names a training under its set", () => {
    expect(setName(set("trainings", "house-v1", {}))).toBe(
      "trainings / house-v1",
    );
    expect(setName(set("notes", null, {}))).toBe("notes");
  });

  it("says each cell in words, and a change with no copy yet is never copied", () => {
    expect(cellKey({ state: "copied", lastCopied: WHEN }).key).toBe(
      "safe-copies-state-copied",
    );
    expect(
      cellKey({ state: "changed since", lastCopied: WHEN, changed: 3 }),
    ).toEqual({
      key: "safe-copies-state-changed",
      when: WHEN,
      count: 3,
    });
    expect(cellKey({ state: "changed since", lastCopied: null }).key).toBe(
      "safe-copies-state-never",
    );
    expect(
      cellKey({ state: "refused", why: "made from a game's files" }).key,
    ).toBe("safe-copies-state-refused");
    expect(cellKey({ state: "not ready", problem: "not chosen" }).key).toBe(
      "safe-copies-state-not-ready",
    );
  });

  it("a set refused at one destination and copied at the other wants nothing", () => {
    expect(
      wantsCopy(
        set("t", "v", {
          local: { state: "copied", lastCopied: WHEN },
          repository: { state: "refused" },
        }),
      ),
    ).toBe(false);
    expect(
      wantsCopy(set("t", "v", { local: { state: "never copied" } }, true)),
    ).toBe(true);
  });

  it("counts what Copy now did, and whether the repository's copy was sent", () => {
    const counts = copyCounts({
      ok: true,
      title: "",
      refusal: null,
      data: {
        results: [
          {
            destination: "local",
            copied: [{ path: "a", bytes: 5 }],
            same: 2,
            failed: [],
            warnings: [],
            git: null,
          },
          {
            destination: "repository",
            copied: [{ path: "a", bytes: 5 }],
            same: 1,
            failed: [{ path: "(git)", error: "could not reach GitHub" }],
            warnings: [],
            git: {
              committed: true,
              pushed: false,
              error: "could not reach GitHub",
            },
          },
        ],
      },
    });
    expect(counts).toEqual({
      copied: 2,
      bytes: 10,
      same: 3,
      failed: 1,
      firstProblem: "(git): could not reach GitHub",
      sent: "not-sent",
    });
  });

  it("counts what Check the copies found", () => {
    expect(
      checkCounts({
        ok: true,
        title: "",
        refusal: null,
        data: {
          destinations: [
            { destination: "local", checked: 4, problems: [] },
            {
              destination: "repository",
              checked: 2,
              problems: [{ path: "x.png", problem: "missing" }],
            },
          ],
        },
      }),
    ).toEqual({ checked: 6, problems: 1, firstProblem: "x.png: missing" });
  });

  it("names each kind, and a kind it does not know yet is kept private, never ours", () => {
    expect(kindKey("own")).toBe("safe-copies-kind-own");
    expect(kindKey("game-derived")).toBe("safe-copies-kind-game-derived");
    expect(kindKey("personal")).toBe("safe-copies-kind-personal");
    expect(kindKey("something-new")).toBe("safe-copies-kind-other");
  });
});
