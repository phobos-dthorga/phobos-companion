import {
  ANCHOR_2,
  ANCHOR_3_SECOND,
  ANCHOR_3_THIRD,
  PARTITIONS_2,
  PARTITIONS_3,
} from "./bc7Tables";

/**
 * DirectDraw Surface textures, decoded in the window (0.50.0; the owner's choice of 22 Nov 2026 to draw DDS in the first version):
 * the largest picture of the file, as plain RGBA, so the code viewer can compare before and after as it does any picture. Several
 * games keep their mods' textures as DDS (Workers & Resources and Farming Simulator among the owner's), and browsers cannot draw it.
 *
 * Reads the block-compressed kinds BC1 to BC5 (DXT1 to DXT5, ATI1, ATI2) and BC7, and plain 8-bit kinds; BC6H (high dynamic range)
 * and the rest are named, not drawn. Only the first face of a cube map and the first slice of a volume or an array.
 */

/** A texture's largest picture, as the window draws it. */
export type Texture = {
  width: number;
  height: number;
  /** RGBA, four bytes a pixel, rows top to bottom. */
  pixels: Uint8ClampedArray;
  /** What the file holds, in its own name: "BC7", "DXT5", "B8G8R8A8"... */
  format: string;
  /** Smaller copies kept in the file (mipmaps) beside the largest, which is the one drawn. */
  mipmaps: number;
  /** More than one face, slice or array element: only the first is drawn. */
  layers: number;
};

export type DdsReading =
  | { ok: true; texture: Texture }
  | {
      ok: false;
      problem: "not-dds" | "unsupported" | "truncated" | "too-large";
      format?: string;
    };

const MAGIC = 0x20534444; // "DDS "
const HEADER = 128;
const DX10_HEADER = 20;
const PF_ALPHAPIXELS = 0x1;
const PF_ALPHA = 0x2;
const PF_FOURCC = 0x4;
const PF_RGB = 0x40;
const PF_LUMINANCE = 0x20000;
const CAPS2_CUBEMAP = 0x200;
/** The largest side drawn (agent default): a 16k texture is 1 GB of RGBA, more than a window should hold at once. */
export const MAX_SIDE = 8192;

type Block = (
  source: Uint8Array,
  at: number,
  out: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
) => void;

type Compressed = { name: string; bytes: 8 | 16; block: Block };

function fourCC(text: string): number {
  return (
    text.charCodeAt(0) |
    (text.charCodeAt(1) << 8) |
    (text.charCodeAt(2) << 16) |
    (text.charCodeAt(3) << 24)
  );
}

/** Reads a DDS file's largest picture; says in a word why when it cannot. */
export function decodeDds(bytes: Uint8Array): DdsReading {
  if (bytes.length < HEADER) return { ok: false, problem: "not-dds" };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u32 = (at: number) => view.getUint32(at, true);
  if (u32(0) !== MAGIC || u32(4) !== 124)
    return { ok: false, problem: "not-dds" };
  const height = u32(12);
  const width = u32(16);
  const depth = Math.max(1, u32(24));
  const mipmaps = Math.max(1, u32(28)) - 1;
  const flags = u32(80);
  const code = u32(84);
  const cube = (u32(112) & CAPS2_CUBEMAP) !== 0;
  let layers = (cube ? 6 : 1) * depth;
  let start = HEADER;
  let compressed: Compressed | null = null;
  let plain: Plain | null = null;
  let format = "";
  if (flags & PF_FOURCC) {
    if (code === fourCC("DX10")) {
      if (bytes.length < HEADER + DX10_HEADER)
        return { ok: false, problem: "truncated" };
      start = HEADER + DX10_HEADER;
      const dxgi = u32(128);
      layers *= Math.max(1, u32(140));
      const found = DXGI[dxgi];
      if (!found)
        return {
          ok: false,
          problem: "unsupported",
          format: DXGI_NAMES[dxgi] ?? `DXGI ${dxgi}`,
        };
      format = found.name;
      if ("block" in found) compressed = found;
      else plain = found;
    } else {
      const found = FOURCC.get(code);
      const name = String.fromCharCode(
        code & 255,
        (code >> 8) & 255,
        (code >> 16) & 255,
        (code >>> 24) & 255,
      );
      if (!found)
        return {
          ok: false,
          problem: "unsupported",
          format: /^[\x20-\x7e]{4}$/.test(name) ? name.trim() : `D3D ${code}`,
        };
      format = found.name;
      compressed = found;
    }
  } else if (flags & (PF_RGB | PF_LUMINANCE | PF_ALPHA)) {
    plain = maskedPlain(view, flags);
    if (!plain) return { ok: false, problem: "unsupported" };
    format = plain.name;
  } else {
    return { ok: false, problem: "unsupported" };
  }
  if (width === 0 || height === 0) return { ok: false, problem: "not-dds" };
  if (width > MAX_SIDE || height > MAX_SIDE)
    return { ok: false, problem: "too-large", format };
  const pixels = new Uint8ClampedArray(width * height * 4);
  if (compressed) {
    const across = Math.ceil(width / 4);
    const down = Math.ceil(height / 4);
    if (start + across * down * compressed.bytes > bytes.length)
      return { ok: false, problem: "truncated", format };
    let at = start;
    for (let by = 0; by < down; by++) {
      for (let bx = 0; bx < across; bx++) {
        compressed.block(bytes, at, pixels, bx * 4, by * 4, width, height);
        at += compressed.bytes;
      }
    }
  } else if (plain) {
    if (start + width * height * plain.bytes > bytes.length)
      return { ok: false, problem: "truncated", format };
    plain.read(bytes, start, pixels, width * height);
  }
  return {
    ok: true,
    texture: { width, height, pixels, format, mipmaps, layers },
  };
}

// ---------------------------------------------------------------- BC1 to BC5

/** RGB565 to 8-bit channels, the top bits repeated into the bottom. */
function expand565(value: number, into: number[], at: number) {
  const r = (value >> 11) & 31;
  const g = (value >> 5) & 63;
  const b = value & 31;
  into[at] = (r << 3) | (r >> 2);
  into[at + 1] = (g << 2) | (g >> 4);
  into[at + 2] = (b << 3) | (b >> 2);
  into[at + 3] = 255;
}

function put(
  out: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  texel: number,
  r: number,
  g: number,
  b: number,
  a: number,
) {
  const px = x + (texel & 3);
  const py = y + (texel >> 2);
  if (px >= width || py >= height) return;
  const i = (py * width + px) * 4;
  out[i] = r;
  out[i + 1] = g;
  out[i + 2] = b;
  out[i + 3] = a;
}

/** One BC1 colour block's sixteen colours, as RGBA in `colours` (64 numbers). `fourAlways` for BC2 and BC3, which never punch. */
function colourBlock(
  source: Uint8Array,
  at: number,
  fourAlways: boolean,
  colours: number[],
) {
  const c0 = source[at] | (source[at + 1] << 8);
  const c1 = source[at + 2] | (source[at + 3] << 8);
  const palette = new Array<number>(16);
  expand565(c0, palette, 0);
  expand565(c1, palette, 4);
  if (fourAlways || c0 > c1) {
    for (let c = 0; c < 3; c++) {
      palette[8 + c] = Math.floor((2 * palette[c] + palette[4 + c]) / 3);
      palette[12 + c] = Math.floor((palette[c] + 2 * palette[4 + c]) / 3);
    }
    palette[11] = 255;
    palette[15] = 255;
  } else {
    for (let c = 0; c < 3; c++) {
      palette[8 + c] = Math.floor((palette[c] + palette[4 + c]) / 2);
      palette[12 + c] = 0;
    }
    palette[11] = 255;
    palette[15] = 0;
  }
  const indices =
    (source[at + 4] |
      (source[at + 5] << 8) |
      (source[at + 6] << 16) |
      (source[at + 7] << 24)) >>>
    0;
  for (let t = 0; t < 16; t++) {
    const p = ((indices >>> (2 * t)) & 3) * 4;
    colours[t * 4] = palette[p];
    colours[t * 4 + 1] = palette[p + 1];
    colours[t * 4 + 2] = palette[p + 2];
    colours[t * 4 + 3] = palette[p + 3];
  }
}

/** One BC3/BC4-style eight-value block's sixteen values. */
function valueBlock(source: Uint8Array, at: number, values: number[]) {
  const a0 = source[at];
  const a1 = source[at + 1];
  const palette = [a0, a1, 0, 0, 0, 0, 0, 0];
  if (a0 > a1) {
    for (let i = 1; i < 7; i++)
      palette[i + 1] = Math.floor(((7 - i) * a0 + i * a1) / 7);
  } else {
    for (let i = 1; i < 5; i++)
      palette[i + 1] = Math.floor(((5 - i) * a0 + i * a1) / 5);
    palette[6] = 0;
    palette[7] = 255;
  }
  for (let t = 0; t < 16; t++) {
    const bit = 3 * t;
    const byte = at + 2 + (bit >> 3);
    const pair = source[byte] | ((source[byte + 1] ?? 0) << 8);
    values[t] = palette[(pair >> (bit & 7)) & 7];
  }
}

const scratch = new Array<number>(64);
const scratchA = new Array<number>(16);
const scratchB = new Array<number>(16);

const bc1: Block = (source, at, out, x, y, w, h) => {
  colourBlock(source, at, false, scratch);
  for (let t = 0; t < 16; t++)
    put(
      out,
      x,
      y,
      w,
      h,
      t,
      scratch[t * 4],
      scratch[t * 4 + 1],
      scratch[t * 4 + 2],
      scratch[t * 4 + 3],
    );
};

const bc2: Block = (source, at, out, x, y, w, h) => {
  colourBlock(source, at + 8, true, scratch);
  for (let t = 0; t < 16; t++) {
    const nibble = (source[at + (t >> 1)] >> ((t & 1) * 4)) & 15;
    put(
      out,
      x,
      y,
      w,
      h,
      t,
      scratch[t * 4],
      scratch[t * 4 + 1],
      scratch[t * 4 + 2],
      nibble * 17,
    );
  }
};

const bc3: Block = (source, at, out, x, y, w, h) => {
  valueBlock(source, at, scratchA);
  colourBlock(source, at + 8, true, scratch);
  for (let t = 0; t < 16; t++)
    put(
      out,
      x,
      y,
      w,
      h,
      t,
      scratch[t * 4],
      scratch[t * 4 + 1],
      scratch[t * 4 + 2],
      scratchA[t],
    );
};

/** BC4: one channel, drawn grey. */
const bc4: Block = (source, at, out, x, y, w, h) => {
  valueBlock(source, at, scratchA);
  for (let t = 0; t < 16; t++)
    put(out, x, y, w, h, t, scratchA[t], scratchA[t], scratchA[t], 255);
};

/** BC5: two channels, drawn as red and green (a normal map's x and y), blue left at nothing. */
const bc5: Block = (source, at, out, x, y, w, h) => {
  valueBlock(source, at, scratchA);
  valueBlock(source, at + 8, scratchB);
  for (let t = 0; t < 16; t++)
    put(out, x, y, w, h, t, scratchA[t], scratchB[t], 0, 255);
};

// ---------------------------------------------------------------- BC7

type Bc7Mode = {
  subsets: number;
  partitionBits: number;
  rotationBits: number;
  selectionBits: number;
  colourBits: number;
  alphaBits: number;
  endpointP: boolean;
  sharedP: boolean;
  indexBits: number;
  secondBits: number;
};

const BC7_MODES: Bc7Mode[] = [
  [3, 4, 0, 0, 4, 0, 1, 0, 3, 0],
  [2, 6, 0, 0, 6, 0, 0, 1, 3, 0],
  [3, 6, 0, 0, 5, 0, 0, 0, 2, 0],
  [2, 6, 0, 0, 7, 0, 1, 0, 2, 0],
  [1, 0, 2, 1, 5, 6, 0, 0, 2, 3],
  [1, 0, 2, 0, 7, 8, 0, 0, 2, 2],
  [1, 0, 0, 0, 7, 7, 1, 0, 4, 0],
  [2, 6, 0, 0, 5, 5, 1, 0, 2, 0],
].map(([s, pb, rb, isb, cb, ab, epb, spb, ib, ib2]) => ({
  subsets: s,
  partitionBits: pb,
  rotationBits: rb,
  selectionBits: isb,
  colourBits: cb,
  alphaBits: ab,
  endpointP: epb === 1,
  sharedP: spb === 1,
  indexBits: ib,
  secondBits: ib2,
}));

const WEIGHTS: Record<number, number[]> = {
  2: [0, 21, 43, 64],
  3: [0, 9, 18, 27, 37, 46, 55, 64],
  4: [0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64],
};

function interpolate(e0: number, e1: number, weight: number): number {
  return ((64 - weight) * e0 + weight * e1 + 32) >> 6;
}

/** A quantised endpoint to 8 bits: shifted to the top, its top bits repeated below. */
function unquantise(value: number, bits: number): number {
  const top = value << (8 - bits);
  return top | (top >> bits);
}

const endpoints = Array.from({ length: 6 }, () => [0, 0, 0, 0]);
const firstIndex = new Array<number>(16);
const secondIndex = new Array<number>(16);

const bc7: Block = (source, at, out, x, y, w, h) => {
  let position = 0;
  const read = (count: number): number => {
    let value = 0;
    for (let i = 0; i < count; i++) {
      value |= ((source[at + (position >> 3)] >> (position & 7)) & 1) << i;
      position++;
    }
    return value;
  };
  let mode = 0;
  while (mode < 8 && read(1) === 0) mode++;
  if (mode === 8) {
    for (let t = 0; t < 16; t++) put(out, x, y, w, h, t, 0, 0, 0, 0);
    return;
  }
  const m = BC7_MODES[mode];
  const partition = read(m.partitionBits);
  const rotation = read(m.rotationBits);
  const selection = read(m.selectionBits);
  const count = m.subsets * 2;
  for (let c = 0; c < 3; c++)
    for (let e = 0; e < count; e++) endpoints[e][c] = read(m.colourBits);
  for (let e = 0; e < count; e++)
    endpoints[e][3] = m.alphaBits ? read(m.alphaBits) : 255;
  const pBit = m.endpointP || m.sharedP;
  if (m.endpointP) {
    for (let e = 0; e < count; e++) {
      const p = read(1);
      for (let c = 0; c < 4; c++) endpoints[e][c] = (endpoints[e][c] << 1) | p;
    }
  } else if (m.sharedP) {
    for (let s = 0; s < m.subsets; s++) {
      const p = read(1);
      for (const e of [2 * s, 2 * s + 1])
        for (let c = 0; c < 4; c++)
          endpoints[e][c] = (endpoints[e][c] << 1) | p;
    }
  }
  const colourBits = m.colourBits + (pBit ? 1 : 0);
  const alphaBits = m.alphaBits ? m.alphaBits + (pBit ? 1 : 0) : 0;
  for (let e = 0; e < count; e++) {
    for (let c = 0; c < 3; c++)
      endpoints[e][c] = unquantise(endpoints[e][c], colourBits);
    endpoints[e][3] = alphaBits ? unquantise(endpoints[e][3], alphaBits) : 255;
  }
  const table =
    m.subsets === 2 ? PARTITIONS_2 : m.subsets === 3 ? PARTITIONS_3 : null;
  const subsetOf = (t: number) => (table ? table[partition * 16 + t] : 0);
  const anchors =
    m.subsets === 2
      ? [0, ANCHOR_2[partition]]
      : m.subsets === 3
        ? [0, ANCHOR_3_SECOND[partition], ANCHOR_3_THIRD[partition]]
        : [0];
  for (let t = 0; t < 16; t++)
    firstIndex[t] = read(anchors.includes(t) ? m.indexBits - 1 : m.indexBits);
  if (m.secondBits)
    for (let t = 0; t < 16; t++)
      secondIndex[t] = read(t === 0 ? m.secondBits - 1 : m.secondBits);
  for (let t = 0; t < 16; t++) {
    const s = subsetOf(t);
    const e0 = endpoints[2 * s];
    const e1 = endpoints[2 * s + 1];
    let colourWeight: number;
    let alphaWeight: number;
    if (m.secondBits && selection === 0) {
      colourWeight = WEIGHTS[m.indexBits][firstIndex[t]];
      alphaWeight = WEIGHTS[m.secondBits][secondIndex[t]];
    } else if (m.secondBits) {
      colourWeight = WEIGHTS[m.secondBits][secondIndex[t]];
      alphaWeight = WEIGHTS[m.indexBits][firstIndex[t]];
    } else {
      colourWeight = WEIGHTS[m.indexBits][firstIndex[t]];
      alphaWeight = colourWeight;
    }
    const texel = [
      interpolate(e0[0], e1[0], colourWeight),
      interpolate(e0[1], e1[1], colourWeight),
      interpolate(e0[2], e1[2], colourWeight),
      interpolate(e0[3], e1[3], alphaWeight),
    ];
    if (rotation) {
      const swap = texel[rotation - 1];
      texel[rotation - 1] = texel[3];
      texel[3] = swap;
    }
    put(out, x, y, w, h, t, texel[0], texel[1], texel[2], texel[3]);
  }
};

// ---------------------------------------------------------------- plain kinds

type Plain = {
  name: string;
  bytes: number;
  read: (
    source: Uint8Array,
    at: number,
    out: Uint8ClampedArray,
    count: number,
  ) => void;
};

/** A plain kind in a fixed order: which source byte each of R, G, B and A comes from (-1: full, -2: copy red). */
function ordered(name: string, bytes: number, order: number[]): Plain {
  return {
    name,
    bytes,
    read(source, at, out, count) {
      for (let p = 0; p < count; p++) {
        const from = at + p * bytes;
        for (let c = 0; c < 4; c++) {
          const o = order[c];
          out[p * 4 + c] =
            o === -1 ? 255 : o === -2 ? out[p * 4] : source[from + o];
        }
      }
    },
  };
}

function shiftOf(mask: number): number {
  let shift = 0;
  while (mask && !((mask >>> shift) & 1)) shift++;
  return shift;
}

/** An older plain kind described by its bit count and masks. */
function maskedPlain(view: DataView, flags: number): Plain | null {
  const bitCount = view.getUint32(88, true);
  const masks = [92, 96, 100, 104].map((at) => view.getUint32(at, true));
  if (![8, 16, 24, 32].includes(bitCount)) return null;
  const bytes = bitCount / 8;
  const luminance = (flags & PF_LUMINANCE) !== 0;
  const alphaOnly =
    (flags & PF_ALPHA) !== 0 && !(flags & (PF_RGB | PF_LUMINANCE));
  const hasAlpha =
    (flags & (PF_ALPHAPIXELS | PF_ALPHA)) !== 0 && masks[3] !== 0;
  const name = luminance
    ? `L${bitCount}`
    : alphaOnly
      ? `A${bitCount}`
      : `RGB${hasAlpha ? "A" : ""} ${bitCount}-bit`;
  const channel = (value: number, mask: number) => {
    if (!mask) return 0;
    const shift = shiftOf(mask);
    const top = mask >>> shift;
    return Math.round((((value & mask) >>> shift) * 255) / top);
  };
  return {
    name,
    bytes,
    read(source, at, out, count) {
      for (let p = 0; p < count; p++) {
        let value = 0;
        for (let b = 0; b < bytes; b++)
          value |= source[at + p * bytes + b] << (8 * b);
        value >>>= 0;
        const o = p * 4;
        if (alphaOnly) {
          out[o] = out[o + 1] = out[o + 2] = 255;
          out[o + 3] = channel(value, masks[3] || 0xff);
        } else if (luminance) {
          out[o] = out[o + 1] = out[o + 2] = channel(value, masks[0]);
          out[o + 3] = hasAlpha ? channel(value, masks[3]) : 255;
        } else {
          out[o] = channel(value, masks[0]);
          out[o + 1] = channel(value, masks[1]);
          out[o + 2] = channel(value, masks[2]);
          out[o + 3] = hasAlpha ? channel(value, masks[3]) : 255;
        }
      }
    },
  };
}

// ---------------------------------------------------------------- kinds by name

const BC1 = { name: "BC1 (DXT1)", bytes: 8, block: bc1 } as const;
const BC2 = { name: "BC2 (DXT3)", bytes: 16, block: bc2 } as const;
const BC3 = { name: "BC3 (DXT5)", bytes: 16, block: bc3 } as const;
const BC4 = { name: "BC4", bytes: 8, block: bc4 } as const;
const BC5 = { name: "BC5", bytes: 16, block: bc5 } as const;
const BC7 = { name: "BC7", bytes: 16, block: bc7 } as const;

const FOURCC = new Map<number, Compressed>([
  [fourCC("DXT1"), BC1],
  [fourCC("DXT2"), BC2],
  [fourCC("DXT3"), BC2],
  [fourCC("DXT4"), BC3],
  [fourCC("DXT5"), BC3],
  [fourCC("ATI1"), BC4],
  [fourCC("BC4U"), BC4],
  [fourCC("ATI2"), BC5],
  [fourCC("BC5U"), BC5],
]);

const RGBA8 = ordered("R8G8B8A8", 4, [0, 1, 2, 3]);
const BGRA8 = ordered("B8G8R8A8", 4, [2, 1, 0, 3]);
const BGRX8 = ordered("B8G8R8X8", 4, [2, 1, 0, -1]);
const R8 = ordered("R8", 1, [0, -2, -2, -1]);

const DXGI: Record<number, Compressed | Plain> = {
  27: RGBA8,
  28: RGBA8,
  29: RGBA8,
  61: R8,
  70: BC1,
  71: BC1,
  72: BC1,
  73: BC2,
  74: BC2,
  75: BC2,
  76: BC3,
  77: BC3,
  78: BC3,
  79: BC4,
  80: BC4,
  82: BC5,
  83: BC5,
  87: BGRA8,
  88: BGRX8,
  90: BGRA8,
  91: BGRA8,
  92: BGRX8,
  93: BGRX8,
  97: BC7,
  98: BC7,
  99: BC7,
};

/** Names for kinds read but not drawn, so the words say what the file is. */
const DXGI_NAMES: Record<number, string> = {
  2: "R32G32B32A32 float",
  10: "R16G16B16A16 float",
  24: "R10G10B10A2",
  81: "BC4 signed",
  84: "BC5 signed",
  94: "BC6H",
  95: "BC6H",
  96: "BC6H signed",
};
