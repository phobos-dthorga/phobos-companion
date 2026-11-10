/*
 * The planet as plain arrays, and everything about it that is arithmetic: decoding the kit's arrays, each tile's
 * outline, where a tile is, and which tile a point on the sphere lies in. No drawing happens here, so all of it is
 * tested without a screen.
 */
import type { GlobeArray, GlobeBlockData, TypedValues } from "./types";

const DEGREES = 180 / Math.PI;

/** The kit's base64 array as a typed array. The kit writes little-endian, as every PC this runs on reads. */
export function decodeArray(array: GlobeArray): TypedValues {
  const bytes = base64Bytes(array.data);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  switch (array.dtype) {
    case "u8":
      return new Uint8Array(buffer);
    case "u16":
      return new Uint16Array(buffer);
    case "i32":
      return new Int32Array(buffer);
    case "f32":
      return new Float32Array(buffer);
  }
}

function base64Bytes(text: string): Uint8Array {
  const native = (
    Uint8Array as unknown as { fromBase64?: (s: string) => Uint8Array }
  ).fromBase64;
  if (native) return native(text);
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type Planet = {
  tiles: number;
  /** x, y, z of each tile's point on the unit sphere; y is up. */
  positions: Float32Array;
  ringStart: Int32Array;
  /** Each tile's neighbours in order round it, anticlockwise seen from outside. */
  ring: Int32Array;
};

export function planetOf(globe: GlobeBlockData): Planet {
  return {
    tiles: globe.tiles,
    positions: decodeArray(globe.positions) as Float32Array,
    ringStart: decodeArray(globe.ring_start) as Int32Array,
    ring: decodeArray(globe.ring) as Int32Array,
  };
}

export function neighbours(planet: Planet, tile: number): Int32Array {
  return planet.ring.subarray(
    planet.ringStart[tile],
    planet.ringStart[tile + 1],
  );
}

/** A tile's outline as the game builds it: the centre of the triangle it makes with each pair of neighbours. */
export function cornersOf(planet: Planet, tile: number): Float32Array {
  const around = neighbours(planet, tile);
  const p = planet.positions;
  const out = new Float32Array(around.length * 3);
  for (let k = 0; k < around.length; k++) {
    const a = around[k] * 3;
    const b = around[(k + 1) % around.length] * 3;
    const x = p[tile * 3] + p[a] + p[b];
    const y = p[tile * 3 + 1] + p[a + 1] + p[b + 1];
    const z = p[tile * 3 + 2] + p[a + 2] + p[b + 2];
    const length = Math.hypot(x, y, z);
    out[k * 3] = x / length;
    out[k * 3 + 1] = y / length;
    out[k * 3 + 2] = z / length;
  }
  return out;
}

/** Longitude and latitude in degrees as the game reckons them: from the mean of the tile's corners. */
export function longLatOf(
  planet: Planet,
  tile: number,
): { longitude: number; latitude: number } {
  const corners = cornersOf(planet, tile);
  const count = corners.length / 3;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let k = 0; k < count; k++) {
    x += corners[k * 3];
    y += corners[k * 3 + 1];
    z += corners[k * 3 + 2];
  }
  x /= count;
  y /= count;
  z /= count;
  return {
    longitude: Math.atan2(x, -z) * DEGREES,
    latitude: Math.asin(Math.max(-1, Math.min(1, y))) * DEGREES,
  };
}

/** A place as the game writes it: 12.34°N 56.78°E. */
export function formatLongLat(where: {
  longitude: number;
  latitude: number;
}): string {
  const latitude = `${Math.abs(where.latitude).toFixed(2)}°${where.latitude < 0 ? "S" : "N"}`;
  const longitude = `${Math.abs(where.longitude).toFixed(2)}°${where.longitude < 0 ? "W" : "E"}`;
  return `${latitude} ${longitude}`;
}

/** The point on the unit sphere at a longitude and latitude, the inverse of the game's reckoning. */
export function pointAt(
  longitude: number,
  latitude: number,
): [number, number, number] {
  const lat = latitude / DEGREES;
  const long = longitude / DEGREES;
  return [
    Math.cos(lat) * Math.sin(long),
    Math.sin(lat),
    -Math.cos(lat) * Math.cos(long),
  ];
}

export type Mesh = {
  /** Each tile is a fan: its own point, then its corners. */
  position: Float32Array;
  /** The tile each vertex belongs to. */
  tile: Float32Array;
  /** 0 at a tile's point, 1 at its corners: the outline is where this reaches 1. */
  rim: Uint8Array;
  index: Uint32Array;
};

/** Every tile as a fan of triangles from its point to its corners, ready for the graphics card. */
export function buildMesh(planet: Planet): Mesh {
  const corners = planet.ring.length;
  const vertices = planet.tiles + corners;
  const position = new Float32Array(vertices * 3);
  const tile = new Float32Array(vertices);
  const rim = new Uint8Array(vertices);
  const index = new Uint32Array(corners * 3);
  const p = planet.positions;
  let vertex = 0;
  let triangle = 0;
  for (let t = 0; t < planet.tiles; t++) {
    const start = planet.ringStart[t];
    const count = planet.ringStart[t + 1] - start;
    const centre = vertex;
    position.set(p.subarray(t * 3, t * 3 + 3), vertex * 3);
    tile[vertex] = t;
    vertex++;
    for (let k = 0; k < count; k++) {
      const a = planet.ring[start + k] * 3;
      const b = planet.ring[start + ((k + 1) % count)] * 3;
      const x = p[t * 3] + p[a] + p[b];
      const y = p[t * 3 + 1] + p[a + 1] + p[b + 1];
      const z = p[t * 3 + 2] + p[a + 2] + p[b + 2];
      const length = Math.hypot(x, y, z);
      position[vertex * 3] = x / length;
      position[vertex * 3 + 1] = y / length;
      position[vertex * 3 + 2] = z / length;
      tile[vertex] = t;
      rim[vertex] = 1;
      vertex++;
    }
    for (let k = 0; k < count; k++) {
      index[triangle++] = centre;
      index[triangle++] = centre + 1 + k;
      index[triangle++] = centre + 1 + ((k + 1) % count);
    }
  }
  return { position, tile, rim, index };
}

const BUCKET_DEGREES = 2;
const BUCKET_COLUMNS = 360 / BUCKET_DEGREES;
const BUCKET_ROWS = 180 / BUCKET_DEGREES;

function bucketOf(x: number, y: number, z: number): number {
  const longitude = Math.atan2(x, -z) * DEGREES;
  const latitude = Math.asin(Math.max(-1, Math.min(1, y))) * DEGREES;
  const column = Math.min(
    BUCKET_COLUMNS - 1,
    Math.floor((longitude + 180) / BUCKET_DEGREES),
  );
  const row = Math.min(
    BUCKET_ROWS - 1,
    Math.floor((latitude + 90) / BUCKET_DEGREES),
  );
  return row * BUCKET_COLUMNS + column;
}

/**
 * Which tile a point on the sphere lies in: start from a tile in the same patch of sky, then step to whichever
 * neighbour is nearer the point until none is. On tiles made this way the nearest tile is always reached.
 */
export function makeFinder(
  planet: Planet,
): (x: number, y: number, z: number) => number {
  const starts = new Int32Array(BUCKET_COLUMNS * BUCKET_ROWS).fill(-1);
  const p = planet.positions;
  for (let t = 0; t < planet.tiles; t++) {
    const bucket = bucketOf(p[t * 3], p[t * 3 + 1], p[t * 3 + 2]);
    if (starts[bucket] < 0) starts[bucket] = t;
  }
  return (x, y, z) => {
    let current = starts[bucketOf(x, y, z)];
    if (current < 0) current = 0;
    let best =
      x * p[current * 3] + y * p[current * 3 + 1] + z * p[current * 3 + 2];
    for (;;) {
      let next = current;
      for (const n of neighbours(planet, current)) {
        const closeness = x * p[n * 3] + y * p[n * 3 + 1] + z * p[n * 3 + 2];
        if (closeness > best) {
          best = closeness;
          next = n;
        }
      }
      if (next === current) return current;
      current = next;
    }
  };
}
