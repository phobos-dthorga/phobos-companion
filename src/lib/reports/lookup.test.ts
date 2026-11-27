import { describe, expect, it } from "vitest";
import { definitionName, lookKind } from "./lookup";

describe("Look up (0.106.0)", () => {
  it("takes names as games write them, with wildcards for a search", () => {
    for (const name of ["C17_Globemaster", "Gun_*", " Steel ", "Base.Thing-2"])
      expect(definitionName(name)).toBe(true);
    for (const name of ["", "-x", "a b", "a/b", "**", "a".repeat(121)])
      expect(definitionName(name)).toBe(false);
  });

  it("reads the look a place names, else who defines it", () => {
    expect(lookKind("patched")).toBe("patched");
    expect(lookKind("sql")).toBe("who");
    expect(lookKind(undefined)).toBe("who");
  });
});
