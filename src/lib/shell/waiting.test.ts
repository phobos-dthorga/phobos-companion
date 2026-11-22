import { describe, expect, it } from "vitest";
import {
  counted,
  SCAN_STALE_MS,
  scanIsStale,
  withPart,
  type Parts,
} from "./waiting";

describe("what waits on you", () => {
  it("keeps only numbers above nought, so nothing waiting and unknown show no mark", () => {
    let parts: Parts = {};
    parts = withPart(parts, "decisions", "waiting", 3);
    parts = withPart(parts, "picks", "waiting", 0);
    parts = withPart(parts, "tests", "seen", null);
    expect(counted(parts)).toEqual({ decisions: 3 });
  });

  it("adds a page's parts up, leaving out one that could not be read (0.67.0)", () => {
    let parts: Parts = {};
    parts = withPart(parts, "mods", "settings", 2);
    parts = withPart(parts, "mods", "todo", 1);
    parts = withPart(parts, "mods", "patched", null);
    parts = withPart(parts, "modlist", "faults", 0);
    parts = withPart(parts, "modlist", "moves", 4);
    expect(counted(parts)).toEqual({ mods: 3, modlist: 4 });
  });

  it("scans again once five minutes have passed", () => {
    expect(scanIsStale(1000, 1000 + SCAN_STALE_MS - 1)).toBe(false);
    expect(scanIsStale(1000, 1000 + SCAN_STALE_MS)).toBe(true);
  });
});
