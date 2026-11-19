import type { Failed } from "../shell/types";

/** One version's line from the changelog. */
export type VersionNote = {
  version: string;
  date: string | null;
  summary: string;
};

export type Library = { name: string; licence: string };

/** What the host says about the running program (0.25.0). */
export type About = {
  version: string;
  built_commit: string | null;
  built_unix: number | null;
  built_from: string;
  repository_name: string;
  program: string | null;
  data_folder: string | null;
  source: string | null;
  repository_version: string | null;
  commits_since: number | null;
  this_version: VersionNote | null;
  newer: VersionNote[];
  installer: string | null;
  libraries: Library[];
};

export type AboutReading =
  | { state: "reading" }
  | { state: "ready"; about: About }
  | { state: "browser" }
  | Failed;
