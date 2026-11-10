/*
 * What the atlas says in words: a tile's details, the places grouped for the list, and the order things are offered
 * in. Reads the decoded globe; draws nothing.
 */
import { t } from "../i18n/runtime";
import { shownValue, unitSuffix } from "./colours";
import {
  decodeArray,
  formatLongLat,
  longLatOf,
  planetOf,
  type Planet,
} from "./planet";
import type {
  GlobeBlockData,
  GlobeLayerData,
  GlobePlaceData,
  TypedValues,
} from "./types";

export type Atlas = {
  globe: GlobeBlockData;
  planet: Planet;
  values: Map<string, TypedValues>;
  /** Places by tile. */
  placesAt: Map<number, GlobePlaceData[]>;
  /** Landscape features by tile. */
  tagsAt: Map<number, string[]>;
  /** Roads and rivers through each tile: the kinds' names. */
  linesAt: Map<number, Set<string>>;
};

/** Decodes everything the window needs once, when a globe arrives. */
export function readAtlas(globe: GlobeBlockData): Atlas {
  const values = new Map<string, TypedValues>();
  for (const layer of globe.layers)
    values.set(layer.key, decodeArray(layer.values));
  const placesAt = new Map<number, GlobePlaceData[]>();
  for (const place of globe.places) {
    const list = placesAt.get(place.tile) ?? [];
    list.push(place);
    placesAt.set(place.tile, list);
  }
  for (const list of placesAt.values())
    list.sort((a, b) => b.priority - a.priority);
  const tagsAt = new Map<number, string[]>();
  for (const tags of globe.tags) {
    const tiles = decodeArray(tags.tiles);
    const which = decodeArray(tags.tags);
    tiles.forEach((tile, i) => {
      const list = tagsAt.get(tile) ?? [];
      list.push(tags.names[which[i]] ?? "");
      tagsAt.set(tile, list);
    });
  }
  const linesAt = new Map<number, Set<string>>();
  for (const lines of globe.lines) {
    const pairs = decodeArray(lines.pairs);
    const kinds = lines.kinds ? decodeArray(lines.kinds) : null;
    for (let i = 0; i < pairs.length / 2; i++) {
      const name = kinds ? (lines.names[kinds[i]] ?? lines.label) : lines.label;
      for (const tile of [pairs[i * 2], pairs[i * 2 + 1]]) {
        const set = linesAt.get(tile) ?? new Set<string>();
        set.add(name);
        linesAt.set(tile, set);
      }
    }
  }
  return {
    globe,
    planet: planetOf(globe),
    values,
    placesAt,
    tagsAt,
    linesAt,
  };
}

/** The views a person can choose between: every layer drawn as colour, in the kit's order. */
export function viewsOf(globe: GlobeBlockData): GlobeLayerData[] {
  return globe.layers.filter(
    (layer) => layer.kind !== "names" && !layer.overlay,
  );
}

export function overlaysOf(globe: GlobeBlockData): GlobeLayerData[] {
  return globe.layers.filter((layer) => layer.overlay);
}

/** The view to open with: the first category layer, as the kit says. */
export function firstView(globe: GlobeBlockData): GlobeLayerData | null {
  const views = viewsOf(globe);
  return views.find((layer) => layer.kind === "categories") ?? views[0] ?? null;
}

export function formatValue(layer: GlobeLayerData, raw: number): string {
  if (layer.missing !== null && raw === layer.missing)
    return layer.missing_label || "—";
  if (layer.kind !== "measure")
    return layer.categories[raw]?.label ?? String(raw);
  const shown = shownValue(layer, raw);
  const smallest = 10 ** -layer.precision;
  if (raw !== 0 && shown > 0 && shown < smallest / 2)
    return t("atlas-under", { value: `${smallest}${unitSuffix(layer.unit)}` });
  return `${shown.toLocaleString("en-AU", {
    minimumFractionDigits: layer.precision,
    maximumFractionDigits: layer.precision,
  })}${unitSuffix(layer.unit)}`;
}

export type Detail = { label: string; value: string };

/** Everything known about one tile, in the order a person reads it. */
export function tileDetails(atlas: Atlas, tile: number): Detail[] {
  const details: Detail[] = [];
  details.push({
    label: t("atlas-detail-where"),
    value: formatLongLat(longLatOf(atlas.planet, tile)),
  });
  for (const layer of atlas.globe.layers) {
    const values = atlas.values.get(layer.key);
    if (!values) continue;
    const raw = values[tile];
    if (layer.kind === "names") {
      if (layer.missing !== null && raw === layer.missing) continue;
      const region = layer.categories[raw];
      if (region)
        details.push({
          label: layer.label,
          value: region.description
            ? `${region.label} (${region.description.toLowerCase()})`
            : region.label,
        });
      continue;
    }
    if (layer.overlay && raw === 0) {
      details.push({ label: layer.label, value: t("atlas-detail-none") });
      continue;
    }
    details.push({ label: layer.label, value: formatValue(layer, raw) });
  }
  const tags = atlas.tagsAt.get(tile);
  if (tags?.length)
    details.push({ label: t("atlas-detail-features"), value: tags.join(", ") });
  const lines = atlas.linesAt.get(tile);
  if (lines?.size)
    details.push({
      label: t("atlas-detail-lines"),
      value: [...lines].join(", "),
    });
  details.push({
    label: t("atlas-detail-tile"),
    value: tile.toLocaleString("en-AU"),
  });
  return details;
}

export type PlaceGroup = { group: string; places: GlobePlaceData[] };

/** Places grouped as the kit groups them, most important group first, each sorted by name; filtered by text. */
export function placeGroups(
  places: GlobePlaceData[],
  filter = "",
): PlaceGroup[] {
  const wanted = filter.trim().toLowerCase();
  const groups = new Map<
    string,
    { priority: number; places: GlobePlaceData[] }
  >();
  for (const place of places) {
    if (
      wanted &&
      !`${place.label} ${place.kind} ${place.detail}`
        .toLowerCase()
        .includes(wanted)
    )
      continue;
    const entry = groups.get(place.group) ?? {
      priority: place.priority,
      places: [],
    };
    entry.priority = Math.max(entry.priority, place.priority);
    entry.places.push(place);
    groups.set(place.group, entry);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].priority - a[1].priority || a[0].localeCompare(b[0]))
    .map(([group, entry]) => ({
      group,
      places: entry.places.sort((a, b) => a.label.localeCompare(b.label)),
    }));
}

/** The place to go to first: the most important one, such as the player's own colony. */
export function homePlace(places: GlobePlaceData[]): GlobePlaceData | null {
  let best: GlobePlaceData | null = null;
  for (const place of places) {
    if (place.kind.toLowerCase() !== "settlement") continue;
    if (!best || place.priority > best.priority) best = place;
  }
  return best ?? places[0] ?? null;
}
