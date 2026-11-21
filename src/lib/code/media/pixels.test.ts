import { describe, expect, it } from "vitest";
import {
  changedShare,
  compare,
  differencePicture,
  rgbOf,
  type Raster,
} from "./pixels";

/** A picture from rows of pixels: "." is see-through, "a" grey, "b" white, any colour the same everywhere it appears. */
function raster(rows: string[]): Raster {
  const height = rows.length;
  const width = rows[0].length;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const colours: Record<string, number[]> = {
    ".": [255, 0, 255, 0],
    a: [128, 128, 128, 255],
    b: [255, 255, 255, 255],
  };
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => pixels.set(colours[c], (y * width + x) * 4)),
  );
  return { width, height, pixels };
}

describe("comparing pictures", () => {
  it("finds a stray line gone and the box round it, as on the truck kits", () => {
    const before = raster(["aa..b", "aa..b", "aa..b"]);
    const after = raster(["aa...", "aa...", "aa..."]);
    const found = compare(before, after);
    expect(found.changed).toBe(3);
    expect(found.box).toEqual({ x: 4, y: 0, width: 1, height: 3 });
    expect(found.sameSize).toBe(true);
    expect(changedShare(found)).toBe("20.0");
  });

  it("treats two see-through pixels as the same whatever colour they hide", () => {
    const before = raster(["..", ".."]);
    const after = raster(["..", ".."]);
    after.pixels.set([0, 255, 0, 0], 0);
    expect(compare(before, after).changed).toBe(0);
    expect(compare(before, after).box).toBeNull();
  });

  it("compares pictures of different sizes from their top-left corners", () => {
    const found = compare(raster(["aa", "aa"]), raster(["aaa", "aaa", "aaa"]));
    expect([found.width, found.height, found.changed, found.sameSize]).toEqual([
      3,
      3,
      5,
      false,
    ]);
  });

  it("lets a small difference pass when asked to", () => {
    const before = raster(["a"]);
    const after = raster(["a"]);
    after.pixels[0] = 130;
    expect(compare(before, after).changed).toBe(1);
    expect(compare(before, after, 2).changed).toBe(0);
  });

  it("marks the changed pixels solid and dims the rest", () => {
    const before = raster(["ab"]);
    const after = raster(["a."]);
    const drawn = differencePicture(
      before,
      after,
      compare(before, after),
      [242, 169, 59],
    );
    expect(Array.from(drawn.slice(4, 8))).toEqual([242, 169, 59, 255]);
    expect(drawn[0]).toBeLessThan(60);
    expect(drawn[3]).toBe(255);
  });

  it("reads a theme colour", () => {
    expect(rgbOf("#F2A93B")).toEqual([242, 169, 59]);
    expect(rgbOf("nonsense")).toEqual([0, 0, 0]);
  });
});
