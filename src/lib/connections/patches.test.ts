import { describe, expect, it } from "vitest";
import {
  CROWDED,
  isRisky,
  riskyNodes,
  targetsAbout,
  type PatchTarget,
} from "./patches";

function target(
  node: string,
  ours: string[],
  mods: string[],
  changed: PatchTarget["changed"] = [],
): PatchTarget {
  return {
    node,
    target: node.slice(3),
    name: node.split(".").slice(-2).join("."),
    assembly: null,
    ours,
    mods,
    skippers: 0,
    changed,
  };
}

const crowded = target(
  "cs:Verse.Pawn.Tick",
  ["cs:Boats.Patches.TickPrefix"],
  ["A", "B", "C"],
);
const quiet = target("cs:Verse.Pawn.Label", ["cs:Boats.Labels.Postfix"], ["A"]);
const changed = target(
  "cs:Verse.Thing.Destroy",
  ["cs:Boats.Patches.Gone"],
  [],
  [
    {
      mod: "RimWorld",
      file: "Assembly-CSharp.dll",
      versions: "1 to 2",
      change: "removed",
    },
  ],
);

describe("patch badges", () => {
  it("finds the targets a method, a patch or a type of patches is part of", () => {
    const all = [crowded, quiet, changed];
    expect(targetsAbout(all, "cs:Verse.Pawn.Tick")).toEqual([crowded]);
    expect(targetsAbout(all, "cs:Boats.Patches.TickPrefix")).toEqual([crowded]);
    expect(targetsAbout(all, "cs:Boats.Patches")).toEqual([crowded, changed]);
    expect(targetsAbout(all, "cs:Boats.Pat")).toEqual([]);
  });

  it("marks crowded and changed targets with their patches, not quiet ones", () => {
    expect(crowded.mods.length).toBe(CROWDED);
    expect(isRisky(quiet)).toBe(false);
    expect([...riskyNodes([crowded, quiet, changed])].sort()).toEqual([
      "cs:Boats.Patches.Gone",
      "cs:Boats.Patches.TickPrefix",
      "cs:Verse.Pawn.Tick",
      "cs:Verse.Thing.Destroy",
    ]);
  });
});
