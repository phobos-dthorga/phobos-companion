import { describe, expect, it } from "vitest";
import {
  allPicks,
  keyOf,
  nextWaiting,
  stepped,
  wordsShown,
} from "./presentation";
import type { Pick, PicksList } from "./types";

function pick(id: string, answered = false): Pick {
  return {
    id,
    title: id,
    kind: "picture",
    inUse: null,
    inUseThere: false,
    tries: [{ id: "1", label: "Try 1", path: "a.png", note: "", there: true }],
    context: "",
    from: "",
    asked: "2026-11-23",
    answer: answered ? { pick: "1", words: "", time: "2026-11-23" } : null,
  };
}

const list: PicksList = {
  waiting: 3,
  repositories: [
    {
      repository: "mods",
      root: "/mods",
      grounds: [],
      picks: [pick("kettle", true), pick("tent")],
    },
    {
      repository: "other",
      root: "/other",
      grounds: [],
      picks: [pick("lamp"), pick("heater")],
    },
  ],
};

describe("picks on the page", () => {
  it("puts the waiting ones first and keys each by its repository", () => {
    expect(allPicks(list).map((p) => keyOf(p))).toEqual([
      "mods/tent",
      "other/lamp",
      "other/heater",
      "mods/kettle",
    ]);
  });

  it("steps round, and moves on to the next one still waiting", () => {
    expect(stepped([1, 2, 3], 2, 1)).toBe(1);
    expect(stepped([1, 2, 3], 0, -1)).toBe(3);
    expect(stepped([1, 2, 3], -1, 1)).toBe(1);
    expect(stepped([], 0, 1)).toBeUndefined();
    const placed = allPicks(list);
    expect(nextWaiting(placed, "other/lamp")?.pick.id).toBe("heater");
    expect(nextWaiting(placed, "other/heater")?.pick.id).toBe("tent");
  });

  it("shows the owner's words in the list on one line, cut at a word when long", () => {
    expect(wordsShown(undefined)).toBe("");
    expect(wordsShown("  Offer both\n as alternate models  ")).toBe(
      "Offer both as alternate models",
    );
    const long =
      "Both with varying specs, just like real life, and a second one too ".repeat(
        3,
      );
    const shown = wordsShown(long, 40);
    expect(shown.endsWith("…")).toBe(true);
    expect(shown.length).toBeLessThanOrEqual(41);
    expect(long.replace(/\s+/g, " ").startsWith(shown.slice(0, -1))).toBe(true);
  });
});
