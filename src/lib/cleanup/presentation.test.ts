import { describe, expect, it } from "vitest";
import {
  chosenBytes,
  firstChoice,
  NUDGE_BYTES,
  worthMentioning,
} from "./presentation";

const groups = [
  { group: "Kit build folder", items: 1, bytes: 29e9, why: "the build" },
  { group: "Install backups", items: 40, bytes: 3e9, why: "older backups" },
  { group: "Cache: rimworld-saves", items: 4, bytes: 2e8, why: "stale" },
];

describe("cleaning up", () => {
  it("chooses every group at first but the install backups, the way back", () => {
    expect(firstChoice(groups)).toEqual([
      "Kit build folder",
      "Cache: rimworld-saves",
    ]);
  });

  it("sums only what is chosen", () => {
    expect(chosenBytes(groups, ["Install backups"])).toBe(3e9);
    expect(chosenBytes(groups, [])).toBe(0);
  });

  it("mentions it on Home from 5 GB", () => {
    const listing = (bytes: number) => ({
      groups: [],
      bytes,
      daemons: 0,
      repositories: [],
      notes: [],
    });
    expect(worthMentioning(listing(NUDGE_BYTES))).toBe(true);
    expect(worthMentioning(listing(NUDGE_BYTES - 1))).toBe(false);
    expect(worthMentioning(null)).toBe(false);
  });
});
