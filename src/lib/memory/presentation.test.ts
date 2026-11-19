import { describe, expect, it } from "vitest";
import {
  alive,
  formatMemory,
  minutesLeft,
  progressFromStatus,
  shownWatch,
  tiles,
} from "./presentation";
import type { KeptWatch, WatchStatus } from "./types";

const KEPT: KeptWatch = {
  watch: "20261119-205419-reload-test-2",
  started: 1_795_000_000,
  label: "reload test 2",
  minutes: 20,
  samples: 240,
  state: "ended",
  reason: "the time asked for ran out",
  counters: true,
};

function running(elapsed: number, collector: number | null): WatchStatus {
  return {
    state: "running",
    watch: "20261119-210000",
    most_mark: 200,
    kept: [KEPT],
    label: "",
    started: 1_795_000_000,
    minutes: 15,
    every: 5,
    seconds: 900,
    elapsed,
    counters: true,
    reason: null,
    samples: 10,
    marks: [],
    saves: [],
    latest: {
      t: 1_795_000_050,
      claimed: 18_340_000_000,
      in_ram: 6_610_000_000,
      free_ram: 20e9,
      collector,
      heap: null,
      gaps: null,
      live: null,
      outside: collector === null ? null : 18_340_000_000 - collector,
    },
  };
}

describe("the memory page's figures", () => {
  it("writes sizes as the tools do, decimal", () => {
    expect(formatMemory(18_340_000_000)).toBe("18.34 GB");
    expect(formatMemory(568_000_000)).toBe("568.0 MB");
    expect(formatMemory(-148_100_000)).toBe("-148.1 MB");
    expect(formatMemory(null)).toBe("–");
  });

  it("shows .NET's tiles as unknown until the runtime has counted", () => {
    const early = tiles(running(10, null).latest!);
    expect(early.map((tile) => tile.known)).toEqual([true, true, false, false]);
    const later = tiles(running(60, 7_900_000_000).latest!);
    expect(later[2].value).toBe("7.90 GB");
    expect(later[3].value).toBe("10.44 GB");
  });

  it("counts a running watch's bar from its own clock", () => {
    const bar = progressFromStatus(running(300, null), "Watching");
    expect([bar.step, bar.of]).toEqual([300, 900]);
    expect(bar.detail).toBe("18.34 GB · 6.61 GB");
    expect(minutesLeft(running(300, null))).toBe(10);
    expect(minutesLeft(running(950, null))).toBe(0);
  });

  it("knows a watch that is still going", () => {
    expect(alive("running")).toBe(true);
    expect(alive("finishing")).toBe(true);
    expect(alive("ended")).toBe(false);
    expect(alive("none")).toBe(false);
  });

  it("shows the watch the place names only when it is kept", () => {
    const status = running(10, null);
    expect(shownWatch(KEPT.watch, status)).toBe(KEPT.watch);
    expect(shownWatch("20990101-000000", status)).toBe(status.watch);
    expect(shownWatch(undefined, null)).toBe(null);
  });
});
