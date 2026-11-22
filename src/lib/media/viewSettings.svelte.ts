import { readKept, writeKept, type ViewSettings } from "./viewSettingsKept";

export type { ViewSettings } from "./viewSettingsKept";

/**
 * How pictures are being looked at, in each place they are compared (0.57.0; the owner, 23 Nov 2026: "the remembered image size,
 * background colour, etc. should be remembered between each pick. It makes it VERY HARD to compare otherwise"). Moving to the next
 * pick, try, file or screenshot keeps the view, the zoom, the ground, the tolerance, the side flicked to and the marks; each place
 * (the code viewer, the Mods page, encoded textures, screenshots, Picks) keeps its own. **Since 0.58.0 they are kept between runs
 * too** (the owner: "save the view settings between sessions too"), in the window's own storage, read back with every value checked.
 */
const kept = $state<Record<string, ViewSettings>>(readKept());

// Written back whenever any of them changes; a window whose storage is refused simply forgets them at the end of the run.
$effect.root(() => {
  $effect(() => {
    writeKept(JSON.stringify(kept));
  });
});

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
