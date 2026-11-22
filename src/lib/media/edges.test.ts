import { describe, expect, it } from "vitest";
import {
  dilateDisk,
  distanceSquared,
  erodeDisk,
  findEdges,
  islands,
  markedPicture,
} from "./edges";
import type { Raster } from "./pixels";

/** A picture from rows: "#" solid dark, "w" solid white, "." see-through. */
function raster(rows: string[]): Raster {
  const height = rows.length;
  const width = rows[0].length;
  const pixels = new Uint8ClampedArray(width * height * 4);
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      const colour =
        c === "#"
          ? [40, 40, 40, 255]
          : c === "w"
            ? [240, 240, 240, 255]
            : [0, 0, 0, 0];
      pixels.set(colour, (y * width + x) * 4);
    }),
  );
  return { width, height, pixels };
}

describe("loose bits round a picture, as the edge check finds them", () => {
  it("measures distance exactly, and grows and wears by a disk with nothing beyond the edge", () => {
    const one = new Uint8Array(25);
    one[12] = 1;
    const distance = distanceSquared(one, 5, 5);
    expect([distance[12], distance[13], distance[18], distance[0]]).toEqual([
      0, 1, 2, 8,
    ]);
    expect(Array.from(dilateDisk(one, 5, 5, 1))).toEqual([
      0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const full = new Uint8Array(25).fill(1);
    expect(Array.from(erodeDisk(full, 5, 5, 1)).filter(Boolean)).toHaveLength(
      9,
    );
  });

  it("joins diagonal neighbours into one island", () => {
    const { sizes } = islands(new Uint8Array([1, 0, 0, 1]), 2, 2);
    expect(sizes).toEqual([0, 2]);
  });

  it("counts a loose speck beside the picture and marks it", () => {
    // The picture is 28 pixels, more than a speck's 24.
    const rows = [
      "...........",
      ".#######...",
      ".#######...",
      ".#######...",
      ".#######.#.",
      "...........",
    ];
    const found = findEdges(raster(rows));
    expect([found.specks, found.speckPixels, found.strokes]).toEqual([1, 1, 0]);
    expect(found.marks[4 * 11 + 9]).toBe(1);
    const marked = markedPicture(raster(rows), found, [242, 169, 59]);
    expect(
      Array.from(marked.pixels.slice((4 * 11 + 9) * 4, (4 * 11 + 9) * 4 + 4)),
    ).toEqual([242, 169, 59, 255]);
  });

  it("finds pale paper left on the outer edge of a dark picture", () => {
    const rows = [
      "............",
      ".wwwwwwwwww.",
      ".w########w.",
      ".w########w.",
      ".w########w.",
      ".w########w.",
      ".wwwwwwwwww.",
      "............",
    ];
    expect(findEdges(raster(rows)).fringe).toBeGreaterThan(0);
  });
});
