import { describe, expect, it } from "vitest";
import { savePath, sinceMoment, spaceRows } from "./presentation";
import type { GameFiles } from "./types";

const files = {
  places: { data: "C:\\Data", saves: "C:\\Data\\Saves", screenshots: [] },
  space: {
    data: [
      { name: "Saves", files: 2, bytes: 500, folder: true },
      { name: "Cache", files: 1, bytes: 100, folder: true },
    ],
    dataBytes: 600,
    install: 1000,
    workshop: 0,
  },
} as unknown as GameFiles;

describe("game files", () => {
  it("sends no moment for the last launch, and a day or a week back otherwise", () => {
    const now = new Date("2026-11-19T10:00:00Z");
    expect(sinceMoment("launch", now)).toBeNull();
    expect(sinceMoment("day", now)).toBe("2026-11-18T10:00:00+00:00");
    expect(sinceMoment("week", now)).toBe("2026-11-12T10:00:00+00:00");
  });

  it("finds a save's file, a grouped one inside its group", () => {
    expect(savePath(files, "Colony.rws", "Colony")).toBe(
      "C:\\Data\\Saves\\Colony.rws",
    );
    expect(savePath(files, "Phobos-1", "Sandbox / Phobos-1")).toBe(
      "C:\\Data\\Saves\\Sandbox\\Phobos-1",
    );
  });

  it("puts the install beside the data folder, largest first, each with its share", () => {
    const rows = spaceRows(files, "The game", "Workshop", 10);
    expect(rows.map((r) => r.name)).toEqual(["The game", "Saves", "Cache"]);
    expect(rows[0].share).toBe(1);
    expect(rows[2].share).toBeCloseTo(0.1);
  });
});
