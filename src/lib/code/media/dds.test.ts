import { describe, expect, it } from "vitest";
import {
  ANCHOR_2,
  ANCHOR_3_SECOND,
  ANCHOR_3_THIRD,
  PARTITIONS_2,
  PARTITIONS_3,
} from "./bc7Tables";
import { decodeDds, MAX_SIDE } from "./dds";

/** One block each, with every texel as Pillow 12.3 decodes it (the decoder matched Pillow on every block of every kind). */
const PILLOW: Record<string, { block: string; texels: number[][] }> = {
  bc1: {
    block: "3358ebe395d9b0aa",
    texels: [
      [231, 125, 90, 255],
      [231, 125, 90, 255],
      [231, 125, 90, 255],
      [160, 64, 123, 255],
      [231, 125, 90, 255],
      [160, 64, 123, 255],
      [231, 125, 90, 255],
      [0, 0, 0, 0],
      [90, 4, 156, 255],
      [90, 4, 156, 255],
      [0, 0, 0, 0],
      [160, 64, 123, 255],
      [160, 64, 123, 255],
      [160, 64, 123, 255],
      [160, 64, 123, 255],
      [160, 64, 123, 255],
    ],
  },
  bc3: {
    block: "5f2685703bedba735302a028b8cb4d94",
    texels: [
      [0, 73, 156, 62],
      [13, 55, 104, 95],
      [27, 37, 52, 86],
      [13, 55, 104, 95],
      [27, 37, 52, 46],
      [13, 55, 104, 54],
      [0, 73, 156, 54],
      [27, 37, 52, 38],
      [41, 20, 0, 62],
      [27, 37, 52, 62],
      [0, 73, 156, 78],
      [41, 20, 0, 62],
      [0, 73, 156, 78],
      [41, 20, 0, 46],
      [41, 20, 0, 70],
      [13, 55, 104, 78],
    ],
  },
  "bc7-mode1": {
    block: "e24b3c8f62968be4d2f279f17fd7dc33",
    texels: [
      [89, 129, 119, 255],
      [141, 137, 241, 255],
      [187, 203, 198, 255],
      [134, 118, 89, 255],
      [141, 137, 241, 255],
      [141, 137, 241, 255],
      [199, 102, 46, 255],
      [156, 112, 74, 255],
      [178, 190, 206, 255],
      [159, 163, 224, 255],
      [68, 134, 133, 255],
      [199, 102, 46, 255],
      [150, 150, 233, 255],
      [111, 123, 104, 255],
      [177, 107, 60, 255],
      [205, 229, 181, 255],
    ],
  },
  "bc7-mode4": {
    block: "70a44ae1c8d6e68184f6e503fe04762b",
    texels: [
      [79, 105, 130, 88],
      [33, 148, 151, 115],
      [173, 16, 182, 33],
      [173, 16, 119, 33],
      [33, 148, 109, 115],
      [33, 148, 151, 115],
      [33, 148, 182, 115],
      [79, 105, 182, 88],
      [127, 59, 151, 60],
      [33, 148, 109, 115],
      [33, 148, 109, 115],
      [79, 105, 140, 88],
      [173, 16, 182, 33],
      [127, 59, 172, 60],
      [173, 16, 130, 33],
      [173, 16, 119, 33],
    ],
  },
  "bc7-mode6": {
    block: "c09b8fc94ce0ec145dc5f9271d94d750",
    texels: [
      [116, 152, 57, 157],
      [115, 152, 49, 172],
      [115, 152, 49, 172],
      [122, 153, 94, 81],
      [119, 153, 74, 120],
      [125, 153, 113, 41],
      [117, 152, 63, 145],
      [112, 152, 31, 209],
      [123, 153, 100, 68],
      [111, 152, 24, 224],
      [114, 152, 43, 184],
      [119, 153, 74, 120],
      [117, 152, 63, 145],
      [123, 153, 100, 68],
      [110, 152, 18, 236],
      [115, 152, 49, 172],
    ],
  },
  "bc7-mode7": {
    block: "80f9c1f4a96ccaeb070387839888c3e6",
    texels: [
      [56, 81, 121, 0],
      [121, 40, 195, 8],
      [162, 48, 56, 195],
      [103, 122, 160, 38],
      [56, 81, 121, 0],
      [103, 122, 160, 38],
      [162, 48, 56, 195],
      [121, 40, 195, 8],
      [103, 122, 160, 38],
      [56, 81, 121, 0],
      [134, 43, 149, 69],
      [149, 45, 102, 134],
      [121, 40, 195, 8],
      [56, 81, 121, 0],
      [199, 207, 239, 117],
      [149, 45, 102, 134],
    ],
  },
};

const FOURCC: Record<string, string> = {
  bc1: "DXT1",
  bc3: "DXT5",
};

/** A DDS file holding one 4x4 block, as a game's tools write one. */
function ddsOf(
  kind: string,
  blockHex: string,
  width = 4,
  height = 4,
): Uint8Array {
  const block = Uint8Array.from(
    blockHex.match(/../g)!.map((pair) => parseInt(pair, 16)),
  );
  const dx10 = kind.startsWith("bc7");
  const bytes = new Uint8Array(128 + (dx10 ? 20 : 0) + block.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x20534444, true);
  view.setUint32(4, 124, true);
  view.setUint32(12, height, true);
  view.setUint32(16, width, true);
  view.setUint32(28, 1, true);
  view.setUint32(76, 32, true);
  view.setUint32(80, 0x4, true);
  const code = dx10 ? "DX10" : FOURCC[kind];
  for (let i = 0; i < 4; i++) bytes[84 + i] = code.charCodeAt(i);
  if (dx10) view.setUint32(128, 98, true);
  bytes.set(block, 128 + (dx10 ? 20 : 0));
  return bytes;
}

describe("DDS textures", () => {
  it.each(Object.keys(PILLOW))("decodes a %s block as Pillow does", (kind) => {
    const found = decodeDds(ddsOf(kind, PILLOW[kind].block));
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    const texels = Array.from({ length: 16 }, (_, t) =>
      Array.from(found.texture.pixels.slice(t * 4, t * 4 + 4)),
    );
    expect(texels).toEqual(PILLOW[kind].texels);
  });

  it("keeps BC7's tables as the specification gives them", () => {
    expect(PARTITIONS_2).toHaveLength(64 * 16);
    expect(PARTITIONS_3).toHaveLength(64 * 16);
    expect(PARTITIONS_2.slice(0, 16)).toEqual([
      0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1,
    ]);
    expect(PARTITIONS_3.slice(0, 16)).toEqual([
      0, 0, 1, 1, 0, 0, 1, 1, 0, 2, 2, 1, 2, 2, 2, 2,
    ]);
    expect(ANCHOR_2.slice(15, 22)).toEqual([15, 15, 2, 8, 2, 2, 8]);
    expect(ANCHOR_3_SECOND.slice(0, 4)).toEqual([3, 3, 15, 15]);
    expect(ANCHOR_3_THIRD.slice(0, 4)).toEqual([15, 8, 8, 3]);
    for (let p = 0; p < 64; p++) {
      expect(PARTITIONS_2[p * 16 + ANCHOR_2[p]]).toBe(1);
      expect(PARTITIONS_3[p * 16 + ANCHOR_3_SECOND[p]]).toBe(1);
      expect(PARTITIONS_3[p * 16 + ANCHOR_3_THIRD[p]]).toBe(2);
    }
  });

  it("draws only the texels inside a picture whose sides are not whole blocks", () => {
    const found = decodeDds(ddsOf("bc1", PILLOW.bc1.block, 3, 2));
    expect(found.ok && found.texture.pixels.length).toBe(3 * 2 * 4);
    if (found.ok)
      expect(Array.from(found.texture.pixels.slice(12, 16))).toEqual(
        PILLOW.bc1.texels[4],
      );
  });

  it("says in a word why it cannot draw a file", () => {
    expect(decodeDds(new Uint8Array(10))).toEqual({
      ok: false,
      problem: "not-dds",
    });
    const truncated = ddsOf("bc1", PILLOW.bc1.block, 8, 8);
    expect(decodeDds(truncated)).toMatchObject({
      ok: false,
      problem: "truncated",
    });
    const huge = ddsOf("bc1", PILLOW.bc1.block, MAX_SIDE * 2, 4);
    expect(decodeDds(huge)).toMatchObject({ ok: false, problem: "too-large" });
    const bc6 = ddsOf("bc7-mode6", PILLOW["bc7-mode6"].block);
    new DataView(bc6.buffer).setUint32(128, 95, true);
    expect(decodeDds(bc6)).toEqual({
      ok: false,
      problem: "unsupported",
      format: "BC6H",
    });
  });
});
