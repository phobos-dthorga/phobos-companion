/**
 * Comparing two pictures pixel by pixel (0.50.0): which pixels changed, how many, and the box round them, for the code viewer's
 * Show what changed. Pure arithmetic on RGBA, so it is tested without a screen.
 */

/** A picture as plain RGBA, four bytes a pixel, rows top to bottom. */
export type Raster = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

export type Box = { x: number; y: number; width: number; height: number };

export type Difference = {
  /** The area compared: wide and high enough for both pictures, from their top-left corners. */
  width: number;
  height: number;
  /** One byte a pixel of that area: 1 where the pictures differ. */
  mask: Uint8Array;
  changed: number;
  /** The smallest box holding every changed pixel; null when none changed. */
  box: Box | null;
  sameSize: boolean;
};

/** A pixel's four channels, or nothing at all outside the picture. */
function texel(raster: Raster, x: number, y: number, into: number[]) {
  if (x >= raster.width || y >= raster.height) {
    into[0] = into[1] = into[2] = into[3] = 0;
    return;
  }
  const i = (y * raster.width + x) * 4;
  into[0] = raster.pixels[i];
  into[1] = raster.pixels[i + 1];
  into[2] = raster.pixels[i + 2];
  into[3] = raster.pixels[i + 3];
}

const a = [0, 0, 0, 0];
const b = [0, 0, 0, 0];

/**
 * Which pixels differ. Two pixels both wholly see-through count as the same whatever colour they hold, since nobody sees it (an
 * export often changes it); otherwise any channel differing by more than `tolerance` counts.
 */
export function compare(
  before: Raster,
  after: Raster,
  tolerance = 0,
): Difference {
  const width = Math.max(before.width, after.width);
  const height = Math.max(before.height, after.height);
  const mask = new Uint8Array(width * height);
  let changed = 0;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      texel(before, x, y, a);
      texel(after, x, y, b);
      if (a[3] === 0 && b[3] === 0) continue;
      if (
        Math.abs(a[0] - b[0]) <= tolerance &&
        Math.abs(a[1] - b[1]) <= tolerance &&
        Math.abs(a[2] - b[2]) <= tolerance &&
        Math.abs(a[3] - b[3]) <= tolerance
      )
        continue;
      mask[y * width + x] = 1;
      changed++;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return {
    width,
    height,
    mask,
    changed,
    box:
      changed === 0
        ? null
        : {
            x: left,
            y: top,
            width: right - left + 1,
            height: bottom - top + 1,
          },
    sameSize: before.width === after.width && before.height === after.height,
  };
}

/** An RGB colour from "#RRGGBB"; black when it is not one. */
export function rgbOf(hex: string): [number, number, number] {
  const found = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return found
    ? [parseInt(found[1], 16), parseInt(found[2], 16), parseInt(found[3], 16)]
    : [0, 0, 0];
}

/** How much the unchanged pixels keep of their brightness, so the marks stand out (agent default). */
export const DIMMED = 0.3;

/**
 * The picture Show what changed draws: the after picture greyed and dimmed (the before one where the after has nothing), and every
 * changed pixel solid in the mark colour. A pixel that was there before and is gone now is marked like any other.
 */
export function differencePicture(
  before: Raster,
  after: Raster,
  difference: Difference,
  mark: [number, number, number],
): Uint8ClampedArray {
  const { width, height, mask } = difference;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (mask[y * width + x]) {
        out[o] = mark[0];
        out[o + 1] = mark[1];
        out[o + 2] = mark[2];
        out[o + 3] = 255;
        continue;
      }
      texel(after, x, y, b);
      if (b[3] === 0) texel(before, x, y, b);
      const grey = (0.2126 * b[0] + 0.7152 * b[1] + 0.0722 * b[2]) * DIMMED;
      out[o] = out[o + 1] = out[o + 2] = grey;
      out[o + 3] = b[3];
    }
  }
  return out;
}

/** The share of the area changed, as words-ready percent with one decimal ("0.4"), never "0.0" when something changed. */
export function changedShare(difference: Difference): string {
  const total = difference.width * difference.height;
  if (total === 0 || difference.changed === 0) return "0";
  const share = (difference.changed * 100) / total;
  return share < 0.1 ? "<0.1" : share.toFixed(1);
}
