import { describe, expect, it } from "vitest";
import type { Thing } from "../connections/types";
import {
  levelRank,
  matchFrame,
  nodeId,
  pointsAt,
  searchName,
  shownSignatures,
} from "./presentation";
import type { Signature } from "./types";

function thing(id: string, external: boolean): Thing {
  return {
    id,
    name: id.split(".").slice(-2).join("."),
    kind: "method",
    language: "csharp",
    file: external ? null : "src/Boats/Hull.cs",
    line: external ? null : 12,
    end: null,
    owner: null,
    external,
    assembly: null,
  };
}

function signature(
  id: string,
  level: string,
  evidence: Signature["evidence"] = [],
): Signature {
  return {
    id,
    level,
    category: "Verse",
    signature: "Boom",
    fingerprint: "",
    count: 1,
    first: { line: 1, time: "" },
    last: { line: 1, time: "" },
    example: { headline: "Boom", body: [], bodyLines: 0 },
    evidence,
  };
}

describe("finding a stack frame's code", () => {
  it("searches by type and method, as the tools name things", () => {
    expect(searchName("Phobos.Framework.Boats.Hull.Tick")).toBe("Hull.Tick");
    expect(searchName("Tick")).toBe("Tick");
    expect(nodeId("Boats.Hull.Tick")).toBe("cs:Boats.Hull.Tick");
  });

  it("takes the exact id, this repository's own before an outside thing", () => {
    const found = [
      thing("cs:Other.Hull.Tick", false),
      thing("cs:Boats.Hull.Tick", true),
      thing("cs:Boats.Hull.Tick", false),
    ];
    expect(matchFrame("Boats.Hull.Tick", found)?.external).toBe(false);
    expect(
      matchFrame("Boats.Hull.Tick", [thing("cs:Boats.Hull.Tick", true)])
        ?.external,
    ).toBe(true);
    expect(matchFrame("Boats.Hull.Sink", found)).toBeNull();
  });
});

describe("what a signature points at", () => {
  it("names each mod once, strongest clue first", () => {
    const clues = pointsAt(
      signature("a", "ERROR", [
        { kind: "file", value: "mods:Boats", mod: "", messages: 3 },
        { kind: "assembly", value: "Boats.dll", mod: "Boats", messages: 3 },
        { kind: "namespace", value: "Boats", mod: "Boats", messages: 3 },
        { kind: "patch", value: "sails.id", mod: "Sails", messages: 3 },
        { kind: "patch", value: "oars.id", mod: "Oars", messages: 3 },
      ]),
    );
    expect(clues.map((c) => c.mod || c.value)).toEqual([
      "mods:Boats",
      "Boats",
      "Sails",
    ]);
  });
});

describe("which signatures show", () => {
  it("keeps the chosen levels in the tools' order", () => {
    const groups = [
      signature("e", "ERROR"),
      signature("w", "WARN"),
      signature("i", "INFO"),
    ];
    expect(
      shownSignatures(groups, new Set(["ERROR", "INFO"])).map((g) => g.id),
    ).toEqual(["e", "i"]);
    expect(levelRank("FATAL")).toBeLessThan(levelRank("WARN"));
    expect(levelRank("ODD")).toBeGreaterThan(levelRank("INFO"));
  });
});
