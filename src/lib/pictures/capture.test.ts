import { describe, expect, it } from "vitest";
import { pictureName, pictureScale } from "./capture";

describe("pictures of a page", () => {
  it("names a picture by game, page and when, so pictures sort by when they were taken", () => {
    expect(
      pictureName("RimWorld", "Make-up", new Date(2026, 10, 19, 8, 5, 9)),
    ).toBe("RimWorld Make-up 2026-11-19 08.05.09");
    expect(pictureName("", "Home", new Date(2026, 0, 2, 13, 0, 0))).toBe(
      "Home 2026-01-02 13.00.00",
    );
  });

  it("draws at the screen's sharpness, never past twice", () => {
    expect(pictureScale(1)).toBe(1);
    expect(pictureScale(1.5)).toBe(1.5);
    expect(pictureScale(3)).toBe(2);
    expect(pictureScale(0)).toBe(1);
  });
});
