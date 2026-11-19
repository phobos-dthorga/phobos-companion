/** What the tools answered about other authors' code (0.26.0); `available` is false when this game's tools have no such report. */
export type OtherAnswer<T> = {
  available: boolean;
  ok: boolean;
  refusal: string | null;
  report: import("../reports/types").Report | null;
  data: T;
};

/** One declaration's source, from a public clone or a decompile (phobos-modkit 1.49.0 rimworld-code show). */
export type Declaration = {
  corpus: string;
  source: "source" | "decompiled";
  kind: string;
  full: string;
  signature: string;
  file: string;
  start: number;
  end: number;
  language: string;
  lines: string[];
  numbers: number[];
  more: boolean;
};

export type Shown = { name: string; found: Declaration[]; looked_in: number };

export type Holder = {
  type: string;
  assembly: string | null;
  path: string;
  mod: string | null;
};

export type Held = { name: string; holders: Holder[] };

export type Decompiled = { assembly: string; folder: string; built: boolean };

/** A file the tools keep every build of (rimworld-archive list). */
export type KeptFile = {
  owner: string;
  owner_name: string;
  file: string;
  versions: number;
  newest_version: string | null;
  newest_seen: string | null;
  previous_seen: string | null;
};

export type KeptFiles = { files: KeptFile[] };
