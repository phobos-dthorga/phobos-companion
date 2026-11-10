/*
 * How each view of the planet is coloured. A category layer brings its own colours from the kit (a biome's look); a
 * measure is coloured by a ramp chosen here, by the dataviz rules: one hue light to dark for a magnitude, two hues
 * meeting at a light neutral grey for a quantity with a natural middle (0 °C, sea level). The globe is a filled
 * object rather than marks on the page, so the same ramps serve light and dark themes. Agent choices (10 Nov 2026),
 * for the owner to revise.
 */
import type { GlobeLayerData, GlobeRamp, TypedValues } from "./types";

export type Rgb = [number, number, number];
export type Stop = { value: number; colour: string };

const MIDDLE = "#ecebe7";

/** Each ramp's stops in shown units; values beyond the ends take the end colour. */
export const RAMPS: Record<GlobeRamp, Stop[]> = {
  temperature: [
    { value: -40, colour: "#0d366b" },
    { value: -28, colour: "#1c5cab" },
    { value: -16, colour: "#3987e5" },
    { value: -6, colour: "#9ec5f4" },
    { value: 0, colour: MIDDLE },
    { value: 8, colour: "#fbd0c8" },
    { value: 16, colour: "#f19a8a" },
    { value: 26, colour: "#e05a4e" },
    { value: 36, colour: "#a8302c" },
  ],
  elevation: [
    { value: -500, colour: "#0d366b" },
    { value: -250, colour: "#3987e5" },
    { value: -50, colour: "#9ec5f4" },
    { value: 0, colour: MIDDLE },
    { value: 250, colour: "#f1dcc5" },
    { value: 750, colour: "#d9a77c" },
    { value: 1500, colour: "#b5743f" },
    { value: 2500, colour: "#7d4a22" },
    { value: 4000, colour: "#4a2b14" },
  ],
  rainfall: [
    { value: 0, colour: "#e3f5ee" },
    { value: 150, colour: "#b8e6d4" },
    { value: 300, colour: "#84d3b6" },
    { value: 600, colour: "#4dbd95" },
    { value: 1000, colour: "#1f9c6c" },
    { value: 1600, colour: "#137a53" },
    { value: 2600, colour: "#0b5a3c" },
    { value: 4000, colour: "#063d28" },
  ],
  sequential: [
    { value: 0, colour: "#eef2dc" },
    { value: 15, colour: "#cfdca4" },
    { value: 35, colour: "#a5bd66" },
    { value: 60, colour: "#6f8a35" },
    { value: 100, colour: "#3f531c" },
  ],
  pollution: [
    { value: 0, colour: "#f2b8cf" },
    { value: 25, colour: "#e87ba4" },
    { value: 50, colour: "#c94f86" },
    { value: 75, colour: "#8e2f62" },
  ],
};

/** Tiles with no value (water, for rainfall) and tiles a layer cannot name. */
export const NO_VALUE = "#2c3a4a";
export const UNKNOWN = "#808080";
/** How opaque the pollution overlay is: enough to read the band, not enough to hide the biome. */
export const OVERLAY_ALPHA = 0.85;

export function hexToRgb(hex: string): Rgb {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hexToRgb(UNKNOWN);
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The ramp's colour at a value, blended between the stops either side. */
export function rampColour(stops: Stop[], value: number): Rgb {
  if (value <= stops[0].value) return hexToRgb(stops[0].colour);
  const last = stops[stops.length - 1];
  if (value >= last.value) return hexToRgb(last.colour);
  for (let i = 1; i < stops.length; i++) {
    if (value <= stops[i].value) {
      const low = stops[i - 1];
      const high = stops[i];
      const share = (value - low.value) / (high.value - low.value);
      const a = hexToRgb(low.colour);
      const b = hexToRgb(high.colour);
      return [0, 1, 2].map((k) =>
        Math.round(a[k] + (b[k] - a[k]) * share),
      ) as Rgb;
    }
  }
  return hexToRgb(last.colour);
}

/** A band's colour: the stop at or below its value, so the game's four bands read as four colours. */
export function bandColour(stops: Stop[], value: number): Rgb {
  let chosen = stops[0];
  for (const stop of stops) if (value >= stop.value) chosen = stop;
  return hexToRgb(chosen.colour);
}

export function shownValue(layer: GlobeLayerData, raw: number): number {
  return raw * layer.scale + layer.offset;
}

/** The colour of every tile in a view, as RGBA bytes laid out for a texture `width` wide. */
export function viewColours(
  layer: GlobeLayerData,
  values: TypedValues,
  width: number,
): Uint8Array {
  const rows = Math.ceil(values.length / width);
  const out = new Uint8Array(width * rows * 4);
  const none = hexToRgb(NO_VALUE);
  const categories = layer.categories.map((c) =>
    c.colour ? hexToRgb(c.colour) : hexToRgb(UNKNOWN),
  );
  const stops = RAMPS[layer.ramp];
  for (let t = 0; t < values.length; t++) {
    const raw = values[t];
    let colour: Rgb;
    if (layer.missing !== null && raw === layer.missing) colour = none;
    else if (layer.kind === "categories")
      colour = categories[raw] ?? hexToRgb(UNKNOWN);
    else colour = rampColour(stops, shownValue(layer, raw));
    out[t * 4] = colour[0];
    out[t * 4 + 1] = colour[1];
    out[t * 4 + 2] = colour[2];
    out[t * 4 + 3] = 255;
  }
  return out;
}

/** An overlay's colours: clear where the raw value is 0 or missing, else its band's colour. */
export function overlayColours(
  layer: GlobeLayerData,
  values: TypedValues,
  width: number,
): Uint8Array {
  const rows = Math.ceil(values.length / width);
  const out = new Uint8Array(width * rows * 4);
  const stops = layer.bands.length
    ? layer.bands.map((band, i) => ({
        value: band.low,
        colour:
          RAMPS[layer.ramp][Math.min(i, RAMPS[layer.ramp].length - 1)].colour,
      }))
    : RAMPS[layer.ramp];
  const alpha = Math.round(OVERLAY_ALPHA * 255);
  for (let t = 0; t < values.length; t++) {
    const raw = values[t];
    if (raw === 0 || (layer.missing !== null && raw === layer.missing))
      continue;
    const colour = bandColour(stops, shownValue(layer, raw));
    out[t * 4] = colour[0];
    out[t * 4 + 1] = colour[1];
    out[t * 4 + 2] = colour[2];
    out[t * 4 + 3] = alpha;
  }
  return out;
}

export type KeyEntry = { label: string; colour: string; note?: string };

/** What the colours of a view mean, for the key beside the globe. */
export function keyEntries(
  layer: GlobeLayerData,
  counts?: Map<number, number>,
): KeyEntry[] {
  const entries: KeyEntry[] = [];
  if (layer.kind === "categories") {
    layer.categories.forEach((category, index) => {
      if (layer.missing !== null && index === layer.missing) return;
      if (counts && !counts.get(index)) return;
      entries.push({
        label: category.label,
        colour: category.colour || UNKNOWN,
      });
    });
  } else if (layer.overlay && layer.bands.length) {
    layer.bands.forEach((band, i) => {
      const stops = RAMPS[layer.ramp];
      entries.push({
        label: band.label,
        colour: stops[Math.min(i, stops.length - 1)].colour,
        note: `${band.low}–${band.high}${layer.unit}`,
      });
    });
  } else {
    for (const stop of RAMPS[layer.ramp]) {
      entries.push({
        label: `${stop.value.toLocaleString("en-AU")}${unitSuffix(layer.unit)}`,
        colour: stop.colour,
      });
    }
  }
  if (layer.missing !== null && layer.missing_label)
    entries.push({ label: layer.missing_label, colour: NO_VALUE });
  return entries;
}

export function unitSuffix(unit: string): string {
  if (!unit) return "";
  return unit === "%" || unit.startsWith("°") ? unit : ` ${unit}`;
}

/** How many tiles hold each raw value, for leaving unused categories out of the key. */
export function countValues(values: TypedValues): Map<number, number> {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}
