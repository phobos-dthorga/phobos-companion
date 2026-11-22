import type { PictureView, Zoom } from "./viewing";

/**
 * How pictures are being looked at, kept for the whole run in each place they are compared (0.57.0; the owner, 23 Nov 2026: "the
 * remembered image size, background colour, etc. should be remembered between each pick. It makes it VERY HARD to compare
 * otherwise"). Moving to the next pick, try, file or screenshot keeps the view, the zoom, the ground, the tolerance, the side flicked
 * to and the marks; each place (the code viewer, the Mods page, encoded textures, screenshots, Picks) keeps its own.
 */
export type ViewSettings = {
  view: PictureView;
  zoom: Zoom;
  /** One of the Companion's grounds, or a game's own by its place in a picks file's grounds ("ground-0"). */
  backdrop: string;
  tolerance: number;
  flicked: "before" | "after";
  /** Loose specks, strokes, fringes and haze marked (0.57.0). */
  edges: boolean;
};

const kept = $state<Record<string, ViewSettings>>({});

/** The settings of one place, made the first time with its own starting tolerance. Call it as a component starts, never while drawing. */
export function viewSettings(place: string, tolerance = 0): ViewSettings {
  if (!kept[place])
    kept[place] = {
      view: "side",
      zoom: "fit",
      backdrop: "checks",
      tolerance,
      flicked: "after",
      edges: false,
    };
  return kept[place];
}
