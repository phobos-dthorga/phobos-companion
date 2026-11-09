import { describe, expect, it } from "vitest";
import theme from "../../../themes/house-dthorga.json";
import { contrast } from "./contrast";

const TEXT = 4.5;
const DIVIDER = 1.5;
const surfaces = [
  "canvas",
  "surface",
  "surface_raised",
  "surface_soft",
] as const;
const readable = [
  "text",
  "text_muted",
  "accent",
  "observed",
  "risk",
  "success",
  "comparison",
] as const;

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

describe("the House D'thorga theme", () => {
  for (const surface of surfaces) {
    for (const role of readable) {
      it(`${role} is readable on ${surface}`, () => {
        expect(
          contrast(theme.colours[role], theme.colours[surface]),
        ).toBeGreaterThanOrEqual(TEXT);
      });
    }

    it(`dividers show on ${surface}`, () => {
      expect(
        contrast(theme.colours.line, theme.colours[surface]),
      ).toBeGreaterThanOrEqual(DIVIDER);
    });
  }
});
