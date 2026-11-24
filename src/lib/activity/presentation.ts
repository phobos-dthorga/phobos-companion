import type { Sample } from "./types";

/**
 * The status bar's system activity (0.86.0), as numbers and tiny graphs: each measure's value now, the Companion's share of it,
 * and the points of a graph of the last minute. Tested without a screen.
 */

export type MeasureId = "cpu" | "memory" | "disk" | "network";

export type Measure = {
  id: MeasureId;
  /** The whole computer's value now, in words-ready parts. */
  now: number;
  /** The Companion's share now, in the same unit; null where it can't be told (network). */
  ours: number | null;
  /** The whole computer over the last minute, and the Companion's share of it, each point 0 to 1 of the graph's height. */
  whole: number[];
  share: number[] | null;
  /** How values read: a percentage, or bytes (a second, or held). */
  unit: "percent" | "bytes-per-second" | "bytes";
};

const sum = (a: number, b: number) => a + b;

/** The top of a rate graph: the largest value in the minute, never less than 1 MB/s, so a quiet minute draws flat, not as noise. */
export function rateCeiling(values: number[]): number {
  return Math.max(1024 * 1024, ...values);
}

/** The four measures from the last minute of readings; none when there are no readings yet. */
export function measures(samples: Sample[]): Measure[] {
  const last = samples.at(-1);
  if (!last) return [];
  const disk = samples.map((s) => s.diskRead + s.diskWrite);
  const ourDisk = samples.map((s) => s.ours.diskRead + s.ours.diskWrite);
  const network = samples.map((s) => s.netDown + s.netUp);
  const diskTop = rateCeiling(disk);
  const networkTop = rateCeiling(network);
  const memoryTop = last.memoryTotal || 1;
  return [
    {
      id: "cpu",
      now: last.cpu,
      ours: last.ours.cpu,
      whole: samples.map((s) => s.cpu / 100),
      share: samples.map((s) => s.ours.cpu / 100),
      unit: "percent",
    },
    {
      id: "memory",
      now: last.memoryUsed,
      ours: last.ours.memory,
      whole: samples.map((s) => s.memoryUsed / memoryTop),
      share: samples.map((s) => s.ours.memory / memoryTop),
      unit: "bytes",
    },
    {
      id: "disk",
      now: last.diskRead + last.diskWrite,
      ours: last.ours.diskRead + last.ours.diskWrite,
      whole: disk.map((v) => v / diskTop),
      share: ourDisk.map((v) => v / diskTop),
      unit: "bytes-per-second",
    },
    {
      id: "network",
      now: last.netDown + last.netUp,
      ours: null,
      whole: network.map((v) => v / networkTop),
      share: null,
      unit: "bytes-per-second",
    },
  ].map((m) => ({
    ...m,
    whole: m.whole.map(clamp),
    share: m.share ? m.share.map(clamp) : null,
  })) as Measure[];
}

function clamp(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** A size, short: B, KB, MB or GB, one decimal place under ten. */
export function bytes(value: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = Math.max(0, value);
  let at = 0;
  while (size >= 1024 && at < units.length - 1) {
    size /= 1024;
    at++;
  }
  const shown = at === 0 || size >= 10 ? Math.round(size) : size.toFixed(1);
  return `${shown} ${units[at]}`;
}

/** A measure's value as it reads in the bar: "23%", "12 GB", "4.2 MB/s". */
export function shown(value: number, unit: Measure["unit"]): string {
  if (unit === "percent") return `${Math.round(value)}%`;
  if (unit === "bytes") return bytes(value);
  return `${bytes(value)}/s`;
}

/**
 * A tiny graph's line and the area under it, in a box `width` by `height`: the last minute from the left to the right edge, the
 * newest at the right; points are 0 to 1 of the height, from the bottom.
 */
export function sparkline(
  points: number[],
  width: number,
  height: number,
  slots = 60,
): { line: string; area: string } {
  if (points.length === 0) return { line: "", area: "" };
  const step = width / Math.max(slots - 1, 1);
  const start = width - step * (points.length - 1);
  const xy = points.map(
    (p, i) =>
      `${round(start + step * i)},${round(height - p * (height - 1) - 0.5)}`,
  );
  const line = `M ${xy.join(" L ")}`;
  const area = `${line} L ${round(start + step * (points.length - 1))},${height} L ${round(start)},${height} Z`;
  return { line, area };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** The average of the last minute's values, for words a screen reader can be given when asked. */
export function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce(sum, 0) / values.length;
}
