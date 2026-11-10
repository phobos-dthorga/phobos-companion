/*
 * The kit's globe block (phobos-modkit docs/manifest.md, 1.7.0): a planet of tiles to draw and explore. The kit says
 * what is where; the window decides only how it looks.
 */
import type { ChartRole } from "../reports/types";

/** An array as the kit sends it: little-endian bytes in base64. */
export type GlobeArray = {
  dtype: "u8" | "u16" | "i32" | "f32";
  count: number;
  data: string;
};

export type GlobeRamp =
  "temperature" | "rainfall" | "elevation" | "sequential" | "pollution";

export type GlobeCategory = {
  label: string;
  colour: string;
  description: string;
};

export type GlobeBand = { label: string; low: number; high: number };

export type GlobeLayerData = {
  key: string;
  label: string;
  description: string;
  kind: "categories" | "measure" | "names";
  values: GlobeArray;
  categories: GlobeCategory[];
  unit: string;
  scale: number;
  offset: number;
  precision: number;
  ramp: GlobeRamp;
  missing: number | null;
  missing_label: string;
  overlay: boolean;
  bands: GlobeBand[];
};

export type GlobePlaceData = {
  tile: number;
  label: string;
  kind: string;
  group: string;
  role: ChartRole;
  detail: string;
  priority: number;
};

export type GlobeLinesData = {
  key: string;
  label: string;
  description: string;
  style: "river" | "road";
  pairs: GlobeArray;
  widths: GlobeArray;
  names: string[];
  kinds: GlobeArray | null;
};

export type GlobeTagsData = {
  key: string;
  label: string;
  names: string[];
  tiles: GlobeArray;
  tags: GlobeArray;
};

export type GlobeLabelData = {
  label: string;
  kind: string;
  position: [number, number, number];
  size: number;
};

export type GlobeBlockData = {
  type: "globe";
  title: string;
  description: string;
  tiles: number;
  positions: GlobeArray;
  ring_start: GlobeArray;
  ring: GlobeArray;
  layers: GlobeLayerData[];
  places: GlobePlaceData[];
  lines: GlobeLinesData[];
  tags: GlobeTagsData[];
  labels: GlobeLabelData[];
};

export type TypedValues = Uint8Array | Uint16Array | Int32Array | Float32Array;
