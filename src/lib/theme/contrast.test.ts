import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "./contrast";
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

  it("gives a made theme a plain id, never the program's own", () => {
    expect(idFor("Phobos D'thorga, mine")).toBe("phobos-d-thorga-mine");
    expect(idFor("!")).toBe("my-theme");
    expect(idFor("Mine").startsWith(BUILT_IN_PREFIX)).toBe(false);
  });
});
