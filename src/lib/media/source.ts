import type { Failed } from "../shell/types";
import type { Raster } from "./pixels";

/**
 * Two versions of a picture or a sound to compare, wherever they come from (0.53.0): a commit and its parent in the code viewer,
 * the installed copy and the repository's on the Mods page, a picture and its encoded texture, two screenshots. Each page builds one
 * and hands it to `MediaCompare.svelte`, which reads, decodes and shows both.
 */

/** One side's bytes, from whichever request the page uses. */
export type ReadBytes = () => Promise<
  { state: "ready"; bytes: Uint8Array } | Failed
>;

export type MediaSide = {
  /** Its name on the page: "Before", "Installed now", "What the game loads". */
  label: string;
  /** Its file's name or path: what it is (a picture, a texture, a sound) is told by its extension. */
  path: string;
  read: ReadBytes;
  /** Stored upside down in its file, as RimSort's preset stores a texture for the game: turned over to compare. */
  turnOver?: boolean;
};

/** A colour a game's pictures are seen on (a picks file's grounds), offered beside the Companion's own. */
export type Ground = { name: string; colour: string };

export type MediaSource = {
  /** Changes whenever the sides do, so both are read again. */
  key: string;
  /** A side that does not exist is null: a file added has no before, one removed no after. */
  before: MediaSide | null;
  after: MediaSide | null;
  /** How far a pixel may differ before What changed marks it: 0 for a change to a picture, more for a lossy copy of one. */
  tolerance?: number;
  /** Words shown above a picture that has one side only; none says nothing. */
  alone?: string;
  /** A game's own grounds, offered after the Companion's (0.55.0). */
  grounds?: Ground[];
  /** Where it is compared ("picks", "code", "mods"...): each place keeps its own view, zoom and ground for the run (0.57.0). */
  place?: string;
};

/** A picture turned over top to bottom, as its file stores it for a game that reads it so. */
export function turnedOver(raster: Raster): Raster {
  const row = raster.width * 4;
  const pixels = new Uint8ClampedArray(raster.pixels.length);
  for (let y = 0; y < raster.height; y++)
    pixels.set(
      raster.pixels.subarray(y * row, (y + 1) * row),
      (raster.height - 1 - y) * row,
    );
  return { width: raster.width, height: raster.height, pixels };
}
