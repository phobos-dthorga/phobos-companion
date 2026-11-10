import { describe, expect, it } from "vitest";
import example from "./fixtures/example-globe.json";
import {
  bandColour,
  hexToRgb,
  keyEntries,
  NO_VALUE,
  overlayColours,
  RAMPS,
  rampColour,
  viewColours,
} from "./colours";
import { placeLabels } from "./labels";
import {
  buildMesh,
  cornersOf,
  decodeArray,
  formatLongLat,
  longLatOf,
  makeFinder,
  neighbours,
  pointAt,
} from "./planet";
import {
  firstView,
  formatValue,
  homePlace,
  overlaysOf,
  placeGroups,
  readAtlas,
  tileDetails,
  viewsOf,
} from "./presentation";
import type { GlobeBlockData } from "./types";

// The kit's own example world (phobos-modkit fixtures/README.md): 272 tiles, made-up values.
const globe = example as unknown as GlobeBlockData;
const atlas = readAtlas(globe);
const planet = atlas.planet;
const layer = (key: string) => globe.layers.find((l) => l.key === key)!;

describe("the planet's arithmetic", () => {
  it("decodes the kit's arrays", () => {
    expect(planet.tiles).toBe(272);
    expect(planet.positions.length).toBe(272 * 3);
    expect(decodeArray({ dtype: "u16", count: 2, data: "AwAEAA==" })).toEqual(
      new Uint16Array([3, 4]),
    );
  });

  it("gives every tile five or six corners on the sphere", () => {
    for (let tile = 0; tile < planet.tiles; tile++) {
      const corners = cornersOf(planet, tile);
      expect([15, 18]).toContain(corners.length);
      for (let k = 0; k < corners.length; k += 3)
        expect(
          Math.hypot(corners[k], corners[k + 1], corners[k + 2]),
        ).toBeCloseTo(1, 5);
    }
  });

  it("builds one fan per tile", () => {
    const mesh = buildMesh(planet);
    expect(mesh.tile.length).toBe(planet.tiles + planet.ring.length);
    expect(mesh.index.length).toBe(planet.ring.length * 3);
    expect(Math.max(...mesh.index)).toBe(mesh.tile.length - 1);
  });

  it("finds the nearest tile from anywhere, as a search of every tile would", () => {
    const find = makeFinder(planet);
    const p = planet.positions;
    for (const [long, lat] of [
      [0, 0],
      [37, 81],
      [-120, -45],
      [179.9, 3],
      [-60, -89.5],
    ]) {
      const [x, y, z] = pointAt(long, lat);
      let best = 0;
      let bestDot = -2;
      for (let t = 0; t < planet.tiles; t++) {
        const dot = x * p[t * 3] + y * p[t * 3 + 1] + z * p[t * 3 + 2];
        if (dot > bestDot) {
          bestDot = dot;
          best = t;
        }
      }
      expect(find(x, y, z)).toBe(best);
    }
  });

  it("reckons longitude and latitude as the game does, and writes them so", () => {
    const where = longLatOf(planet, 120);
    const [x, y, z] = pointAt(where.longitude, where.latitude);
    expect(makeFinder(planet)(x, y, z)).toBe(120);
    expect(formatLongLat({ longitude: -12.345, latitude: 4.5 })).toBe(
      "4.50°N 12.35°W",
    );
  });

  it("lists each tile's neighbours round it", () => {
    for (const n of neighbours(planet, 0))
      expect([...neighbours(planet, n)]).toContain(0);
  });
});

describe("colours", () => {
  it("blends between a ramp's stops and holds its ends", () => {
    expect(rampColour(RAMPS.temperature, -100)).toEqual(hexToRgb("#0d366b"));
    expect(rampColour(RAMPS.temperature, 0)).toEqual(hexToRgb("#ecebe7"));
    expect(rampColour(RAMPS.temperature, 100)).toEqual(hexToRgb("#a8302c"));
    const halfway = rampColour(RAMPS.temperature, 4);
    expect(halfway[0]).toBeGreaterThan(236);
  });

  it("gives a band one colour from its low end", () => {
    expect(bandColour(RAMPS.pollution, 30)).toEqual(hexToRgb("#e87ba4"));
  });

  it("colours water as having no value where a layer leaves it out", () => {
    const rainfall = layer("rainfall");
    const colours = viewColours(rainfall, atlas.values.get("rainfall")!, 2048);
    expect([...colours.subarray(0, 3)]).toEqual(hexToRgb(NO_VALUE)); // tile 0 is ocean
    expect(colours[150 * 4 + 3]).toBe(255);
  });

  it("leaves the overlay clear where nothing is polluted", () => {
    const pollution = layer("pollution");
    const colours = overlayColours(
      pollution,
      atlas.values.get("pollution")!,
      2048,
    );
    expect(colours[0 * 4 + 3]).toBe(0);
    expect(colours[130 * 4 + 3]).toBeGreaterThan(0);
    expect([...colours.subarray(130 * 4, 130 * 4 + 3)]).toEqual(
      hexToRgb("#8e2f62"),
    );
  });

  it("keys a view by what it holds", () => {
    const biomes = keyEntries(layer("biome"));
    expect(biomes.map((e) => e.label)).toContain("Ocean");
    const pollution = keyEntries(layer("pollution"));
    expect(pollution.map((e) => e.label)).toEqual([
      "Light",
      "Moderate",
      "Heavy",
      "Extreme",
    ]);
    expect(keyEntries(layer("rainfall")).at(-1)?.label).toBe("water");
  });
});

describe("what the atlas says", () => {
  it("offers views, opens on biomes, and overlays pollution", () => {
    expect(viewsOf(globe).map((l) => l.key)).toEqual([
      "biome",
      "elevation",
      "temperature",
      "rainfall",
      "hilliness",
      "swampiness",
    ]);
    expect(firstView(globe)?.key).toBe("biome");
    expect(overlaysOf(globe).map((l) => l.key)).toEqual(["pollution"]);
  });

  it("writes values in their units", () => {
    expect(formatValue(layer("temperature"), 3000)).toBe("0.0°C");
    expect(formatValue(layer("elevation"), 8192 + 250)).toBe("250 m");
    expect(formatValue(layer("rainfall"), 65535)).toBe("water");
    expect(formatValue(layer("pollution"), 3)).toBe("under 0.1%");
  });

  it("tells everything about a tile", () => {
    const details = Object.fromEntries(
      tileDetails(atlas, 120).map((d) => [d.label, d.value]),
    );
    expect(details.Biome).toBe("Temperate forest");
    expect(details.Pollution).toBe("10.0%");
    expect(details["Roads and rivers"]).toBe("Dirt road");
    expect(details.Tile).toBe("120");
    expect(details.Where).toMatch(/^\d+\.\d\d°[NS] \d+\.\d\d°[EW]$/);
    expect(atlas.placesAt.get(120)?.[0].label).toBe("Example Home");
  });

  it("groups places with the player's own first, and finds them by name", () => {
    const groups = placeGroups(globe.places);
    expect(groups[0].group).toBe("Your colonies and camps");
    // The filter reads names, kinds and factions: the raiders' site matches too.
    expect(
      placeGroups(globe.places, "raider")[0].places.map((p) => p.label),
    ).toEqual(["Example site", "Raider Camp"]);
    expect(placeGroups(globe.places, "nowhere")).toEqual([]);
    expect(homePlace(globe.places)?.label).toBe("Example Home");
  });
});

describe("labels", () => {
  it("places the more important label first and drops one that would overlap it", () => {
    const placed = placeLabels(
      [
        {
          key: "a",
          text: "Small town",
          x: 100,
          y: 100,
          priority: 1,
          kind: "place",
        },
        { key: "b", text: "Home", x: 105, y: 102, priority: 30, kind: "place" },
        {
          key: "c",
          text: "Far away",
          x: 300,
          y: 200,
          priority: 1,
          kind: "place",
        },
        {
          key: "d",
          text: "Off the edge",
          x: 2,
          y: 2,
          priority: 50,
          kind: "place",
        },
      ],
      400,
      300,
      10,
    );
    expect(placed.map((l) => l.key)).toEqual(["b", "c"]);
  });
});
