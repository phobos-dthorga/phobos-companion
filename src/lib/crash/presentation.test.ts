import { describe, expect, it } from "vitest";
import { FIRST_REACH_DAYS, newDumps, newestTime } from "./presentation";
import type { Dump } from "./types";

const dump = (program: string, time: string): Dump => ({
  file: `${program}.exe.1.dmp`,
  program,
  time,
  size: 1,
});
const NOW = new Date("2026-11-27T09:00:00Z");
const DUMPS = [
  dump("GNSSsdFwD", "2026-11-22T15:25:37+00:00"),
  dump("RimWorld", "2026-11-23T13:02:24+00:00"),
  dump("Old", "2026-11-01T00:00:00+00:00"),
];

describe("crash dumps since the person last looked (0.105.0)", () => {
  it("shows the last week's before any was seen, newest first", () => {
    expect(FIRST_REACH_DAYS).toBe(7);
    expect(newDumps(DUMPS, null, NOW).map((d) => d.program)).toEqual([
      "RimWorld",
      "GNSSsdFwD",
    ]);
  });

  it("shows only those written after the newest seen", () => {
    expect(
      newDumps(DUMPS, "2026-11-22T15:25:37+00:00", NOW).map((d) => d.program),
    ).toEqual(["RimWorld"]);
    expect(newDumps(DUMPS, newestTime(DUMPS), NOW)).toEqual([]);
    expect(newestTime([])).toBeNull();
  });
});
