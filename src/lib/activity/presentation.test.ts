import { describe, expect, it } from "vitest";
import { bytes, measures, rateCeiling, shown, sparkline } from "./presentation";
import type { Sample } from "./types";

const MB = 1024 * 1024;

function sample(at: number, over: Partial<Sample> = {}): Sample {
  return {
    at,
    cpu: 20,
    memoryUsed: 8 * 1024 * MB,
    memoryTotal: 32 * 1024 * MB,
    diskRead: 2 * MB,
    diskWrite: 1 * MB,
    netDown: 512 * 1024,
    netUp: 0,
    ours: { cpu: 5, memory: 400 * MB, diskRead: MB, diskWrite: 0 },
    ...over,
  };
}

describe("the status bar's system activity (0.86.0)", () => {
  it("gives each measure's value now and the Companion's share, network without one", () => {
    const found = measures([sample(1), sample(2, { cpu: 40 })]);
    expect(found.map((m) => m.id)).toEqual([
      "cpu",
      "memory",
      "disk",
      "network",
    ]);
    const [cpu, memory, disk, network] = found;
    expect([cpu.now, cpu.ours]).toEqual([40, 5]);
    expect(cpu.whole).toEqual([0.2, 0.4]);
    expect(memory.whole[1]).toBe(0.25);
    expect([disk.now, disk.ours]).toEqual([3 * MB, MB]);
    expect(network.ours).toBeNull();
    expect(network.share).toBeNull();
    expect(measures([])).toEqual([]);
  });

  it("draws a quiet minute flat, and a busy one to its own top", () => {
    expect(rateCeiling([10, 20])).toBe(MB);
    expect(rateCeiling([5 * MB, 2 * MB])).toBe(5 * MB);
    const [, , disk] = measures([sample(1), sample(2, { diskRead: 9 * MB })]);
    expect(Math.max(...disk.whole)).toBe(1);
  });

  it("reads values short, as a status bar should", () => {
    expect(shown(23.4, "percent")).toBe("23%");
    expect(shown(12 * 1024 * MB, "bytes")).toBe("12 GB");
    expect(shown(4.2 * MB, "bytes-per-second")).toBe("4.2 MB/s");
    expect(bytes(512)).toBe("512 B");
    expect(bytes(0)).toBe("0 B");
  });

  it("draws the newest point at the right edge, and an empty minute as nothing", () => {
    const { line, area } = sparkline([0, 1], 60, 20, 60);
    // Half a pixel inside the box at the top and the bottom, so the line is never cut off by its edge.
    expect(line.endsWith("60,0.5")).toBe(true);
    expect(line).toContain(",19.5");
    expect(area.endsWith("Z")).toBe(true);
    expect(sparkline([], 60, 20)).toEqual({ line: "", area: "" });
  });
});
