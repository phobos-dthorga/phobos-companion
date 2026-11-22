import type { Raster } from "./pixels";

/**
 * Loose specks, loose strokes, joined fringes and haze round a cut-out picture (0.56.0; the owner's choice of 23 Nov 2026 on the
 * Picks page: "Mark loose specks and fringes"), found as phobos-rimworld's `scripts/art/edge_check.py` finds them, so a count here is
 * the count on a review card: the same thresholds, the same 8-connected islands, the same erosions and dilations (scipy's, with
 * nothing beyond the picture's edge). Erosion and dilation by a disk use an exact Euclidean distance transform, so a 2048-pixel
 * texture is checked in well under a second. Pure arithmetic on RGBA, tested without a screen.
 */

export const SOLID = 96;
export const SPECK_MOST = 24;
export const THIN = 0.15;
export const STROKE_SHARE = 0.02;
export const FAINT = 8;
export const HAZE_REACH = 2;
export const EDGE = 2;
export const INNER = 5;
export const NEAR = 4;
export const PALE = 200;
export const GREY = 30;
export const SEEN = 64;

export type Edges = {
  specks: number;
  speckPixels: number;
  strokes: number;
  strokePixels: number;
  fringe: number;
  haze: number;
  solid: number;
  /** One byte a pixel: 1 for a speck or a stroke, 2 for a fringe, 3 for haze, 0 for nothing. */
  marks: Uint8Array;
};

const INF = 1e20;

/** Squared distance from each pixel to the nearest feature pixel (Felzenszwalb and Huttenlocher's two passes); INF with none. */
export function distanceSquared(
  feature: Uint8Array,
  width: number,
  height: number,
): Float64Array {
  const out = new Float64Array(width * height);
  for (let i = 0; i < out.length; i++) out[i] = feature[i] ? 0 : INF;
  const n = Math.max(width, height);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const pass = (length: number) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < length; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < length; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  };
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = out[y * width + x];
    pass(height);
    for (let y = 0; y < height; y++) out[y * width + x] = d[y];
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = out[y * width + x];
    pass(width);
    for (let x = 0; x < width; x++) out[y * width + x] = d[x];
  }
  return out;
}

/** A mask grown by a disk of this radius: true where a true pixel lies within it. Nothing beyond the edge. */
export function dilateDisk(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  const distance = distanceSquared(mask, width, height);
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i++)
    out[i] = distance[i] <= radius * radius ? 1 : 0;
  return out;
}

/** A mask worn by a disk of this radius: true where every pixel within it is true and inside the picture (scipy's border 0). */
export function erodeDisk(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  // Padded by the radius, so the outside counts as false.
  const pad = radius + 1;
  const w = width + 2 * pad;
  const h = height + 2 * pad;
  const outside = new Uint8Array(w * h).fill(1);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      outside[(y + pad) * w + x + pad] = mask[y * width + x] ? 0 : 1;
  const distance = distanceSquared(outside, w, h);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      out[y * width + x] =
        mask[y * width + x] &&
        distance[(y + pad) * w + x + pad] > radius * radius
          ? 1
          : 0;
  return out;
}

/** A mask grown or worn by a square of side 2 * radius + 1 (scipy's 3 x 3 and 5 x 5 structures), one direction at a time. */
function square(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
  grow: boolean,
): Uint8Array {
  const along = (source: Uint8Array, horizontal: boolean) => {
    const out = new Uint8Array(source.length);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        let any = false;
        let all = true;
        for (let r = -radius; r <= radius; r++) {
          const px = horizontal ? x + r : x;
          const py = horizontal ? y : y + r;
          const inside = px >= 0 && py >= 0 && px < width && py < height;
          const on = inside && source[py * width + px] === 1;
          if (on) any = true;
          else all = false;
        }
        out[y * width + x] = (grow ? any : all) ? 1 : 0;
      }
    return out;
  };
  return along(along(mask, true), false);
}

/** 8-connected islands of a mask: each pixel's island number (0 for none) and each island's size. */
export function islands(
  mask: Uint8Array,
  width: number,
  height: number,
): { labels: Int32Array; sizes: number[] } {
  const labels = new Int32Array(mask.length);
  const sizes = [0];
  const stack: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    const label = sizes.length;
    let size = 0;
    labels[start] = label;
    stack.push(start);
    while (stack.length > 0) {
      const at = stack.pop() as number;
      size++;
      const x = at % width;
      const y = (at - x) / width;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (mask[next] && !labels[next]) {
            labels[next] = label;
            stack.push(next);
          }
        }
    }
    sizes.push(size);
  }
  return { labels, sizes };
}

/** Everything loose round a picture, counted and marked. */
export function findEdges(raster: Raster): Edges {
  const { width, height, pixels } = raster;
  const count = width * height;
  const alpha = (i: number) => pixels[i * 4 + 3];
  const solid = new Uint8Array(count);
  const shown = new Uint8Array(count);
  const pale = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    solid[i] = alpha(i) >= SOLID ? 1 : 0;
    shown[i] = alpha(i) >= FAINT ? 1 : 0;
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const low = Math.min(r, g, b);
    pale[i] = low >= PALE && Math.max(r, g, b) - low <= GREY ? 1 : 0;
  }
  const marks = new Uint8Array(count);

  // Specks and loose strokes.
  const { labels, sizes } = islands(solid, width, height);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const opened = square(
    square(solid, width, height, 1, false),
    width,
    height,
    1,
    true,
  );
  const kept = new Array<number>(sizes.length).fill(0);
  for (let i = 0; i < count; i++) if (opened[i]) kept[labels[i]]++;
  let specks = 0;
  let speckPixels = 0;
  let strokes = 0;
  let strokePixels = 0;
  const loose = new Uint8Array(sizes.length);
  for (let label = 1; label < sizes.length; label++) {
    const size = sizes[label];
    if (size <= SPECK_MOST) {
      specks++;
      speckPixels += size;
      loose[label] = 1;
    } else if (size <= STROKE_SHARE * total && kept[label] <= THIN * size) {
      strokes++;
      strokePixels += size;
      loose[label] = 1;
    }
  }
  for (let i = 0; i < count; i++) if (loose[labels[i]]) marks[i] = 1;

  // Haze: faint pixels beyond a soft edge's reach of every solid pixel.
  const reach = square(solid, width, height, HAZE_REACH, true);
  let haze = 0;
  for (let i = 0; i < count; i++)
    if (alpha(i) >= FAINT && alpha(i) < SOLID && !reach[i]) {
      haze++;
      if (!marks[i]) marks[i] = 3;
    }

  // A joined fringe: pale, visibly opaque pixels on the outer edge, touching the outside, with nothing pale just inside.
  let fringe = 0;
  if (shown.some((on) => on === 1)) {
    const inside = erodeDisk(shown, width, height, EDGE);
    const deeper = erodeDisk(shown, width, height, INNER);
    const paleInside = new Uint8Array(count);
    for (let i = 0; i < count; i++)
      paleInside[i] = inside[i] && !deeper[i] && pale[i] ? 1 : 0;
    const nearPale = dilateDisk(paleInside, width, height, NEAR);
    const outside = new Uint8Array(count);
    for (let i = 0; i < count; i++) outside[i] = shown[i] ? 0 : 1;
    const touching = square(outside, width, height, 1, true);
    for (let i = 0; i < count; i++)
      if (
        shown[i] &&
        !inside[i] &&
        pale[i] &&
        touching[i] &&
        alpha(i) >= SEEN &&
        !nearPale[i]
      ) {
        fringe++;
        if (!marks[i]) marks[i] = 2;
      }
  }
  return {
    specks,
    speckPixels,
    strokes,
    strokePixels,
    fringe,
    haze,
    solid: total,
    marks,
  };
}

/** The picture with everything loose painted solid in the mark colour, the rest as it is. */
export function markedPicture(
  raster: Raster,
  edges: Edges,
  mark: [number, number, number],
): Raster {
  const pixels = new Uint8ClampedArray(raster.pixels);
  for (let i = 0; i < edges.marks.length; i++)
    if (edges.marks[i]) {
      pixels[i * 4] = mark[0];
      pixels[i * 4 + 1] = mark[1];
      pixels[i * 4 + 2] = mark[2];
      pixels[i * 4 + 3] = 255;
    }
  return { width: raster.width, height: raster.height, pixels };
}
