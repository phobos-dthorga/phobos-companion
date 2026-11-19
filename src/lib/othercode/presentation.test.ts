import { describe, expect, it } from "vitest";
import type { Report } from "../reports/types";
import {
  changedNames,
  comparable,
  isGameItself,
  theirName,
} from "./presentation";

describe("other authors' code", () => {
  it("names an outside C# thing as the tools look it up, and nothing else", () => {
    expect(theirName("cs:Verse.Pawn.Tick")).toBe("Verse.Pawn.Tick");
    expect(theirName("cs:.GroundRearm.FindFallback")).toBe(
      "GroundRearm.FindFallback",
    );
    expect(theirName("def:ThingDef/Steel")).toBeNull();
  });

  it("knows the game's own file is the slow one", () => {
    const holder = { type: "T", assembly: "A", path: "p" };
    expect(isGameItself({ ...holder, mod: "the game" })).toBe(true);
    expect(isGameItself({ ...holder, mod: "Vehicle Framework" })).toBe(false);
  });

  it("offers only files kept twice, newest update first", () => {
    const file = (name: string, versions: number, seen: string) => ({
      owner: "o",
      owner_name: "O",
      file: name,
      versions,
      newest_version: null,
      newest_seen: seen,
      previous_seen: null,
    });
    const found = comparable([
      file("Once.dll", 1, "2026-11-19"),
      file("Old.dll", 2, "2026-11-17"),
      file("New.dll", 3, "2026-11-19"),
    ]);
    expect(found.map((f) => f.file)).toEqual(["New.dll", "Old.dll"]);
  });

  it("reads the changed declarations from a comparison's tables", () => {
    const table = (rows: string[][]) => ({
      type: "table" as const,
      headers: ["Kind", "Name", "Where"],
      rows,
      values: [],
      total: rows.length,
    });
    const report: Report = {
      format: 1,
      title: "code compare",
      lines: [],
      blocks: [],
      sections: [
        {
          heading: "Declarations added (1)",
          level: 2,
          blocks: [table([["method", "A.B.C", "x"]])],
        },
        {
          heading: "Notes",
          level: 2,
          blocks: [{ type: "text", text: "no table" }],
        },
      ],
    };
    expect(changedNames(report)).toEqual([
      { heading: "Declarations added (1)", names: ["A.B.C"] },
    ]);
    expect(changedNames(null)).toEqual([]);
  });
});
