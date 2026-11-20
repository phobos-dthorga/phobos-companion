import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrast, mix } from "./contrast";
import {
  BUILT_IN_PREFIX,
  idFor,
  problems,
  READABLE,
  ROLES,
  SURFACES,
  themeFile,
} from "./presentation";
import type { Theme } from "./types";

/** Every theme the Companion comes with (0.33.0): House D'thorga, Phobos D'thorga and High contrast. */
const FOLDER = "themes";
const themes: Theme[] = readdirSync(FOLDER)
  .filter((name) => name.endsWith(".json"))
  .map((name) => JSON.parse(readFileSync(join(FOLDER, name), "utf-8")));

describe("contrast", () => {
  it("is 21 between black and white", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  it("is the same in either order", () => {
    expect(contrast("#123456", "#ABCDEF")).toBeCloseTo(
      contrast("#ABCDEF", "#123456"),
      10,
    );
  });
});

describe("the Companion's own themes", () => {
  it("are the three, House D'thorga among them", () => {
    expect(themes.map((theme) => theme.name).sort()).toEqual([
      "High contrast",
      "House D'thorga",
      "Phobos D'thorga",
    ]);
  });

  for (const theme of themes) {
    it(`${theme.name} gives every role, and nothing else`, () => {
      expect(Object.keys(theme.colours).sort()).toEqual([...ROLES].sort());
      expect(theme.id.startsWith(BUILT_IN_PREFIX)).toBe(true);
    });

    it(`${theme.name} can be read everywhere: words, charts and lines`, () => {
      expect(problems(theme.colours)).toEqual([]);
      for (const surface of SURFACES)
        for (const role of READABLE)
          expect(
            contrast(theme.colours[role], theme.colours[surface]),
          ).toBeGreaterThanOrEqual(4.5);
    });

    it(`${theme.name} writes back as it was read`, () => {
      expect(JSON.parse(themeFile(theme))).toEqual(theme);
    });
  }
});

describe("checking a theme being made", () => {
  it("names the pair that cannot be read, as the host does", () => {
    const house = themes.find((theme) => theme.name === "House D'thorga")!;
    const dim = { ...house.colours, text_muted: "#3A3A3A" };
    const found = problems(dim).map((p) => `${p.role}/${p.on}`);
    expect(found).toContain("text_muted/canvas");
    expect(found.every((pair) => pair.startsWith("text_muted/"))).toBe(true);
  });

  it("mixes as CSS's color-mix in sRGB does, and as the host does", () => {
    expect(mix("#FF0000", "#000000", 0.2)).toBe("#330000");
    expect(mix("#FF8A7A", "#0E0B10", 0.2)).toBe("#3E2425");
  });

  it("holds words to removed and added lines' backgrounds too", () => {
    const house = themes.find((theme) => theme.name === "House D'thorga")!;
    // Reads on every plain surface (4.55:1 on the softest), not on a changed line's tint.
    const muted = { ...house.colours, text_muted: "#8C8C8C" };
    expect(problems(muted).map((p) => `${p.role}/${p.on}`)).toEqual([
      "text_muted/diff_removed",
      "text_muted/diff_added",
    ]);
  });

  it("gives a made theme a plain id, never the program's own", () => {
    expect(idFor("Phobos D'thorga, mine")).toBe("phobos-d-thorga-mine");
    expect(idFor("!")).toBe("my-theme");
    expect(idFor("Mine").startsWith(BUILT_IN_PREFIX)).toBe(false);
  });
});
