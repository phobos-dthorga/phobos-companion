import type { Failure, Waiting } from "../shell/types";

/** Where a setting's value comes from, first that names one wins (phobos-modkit `settings`, kit 1.30.0). */
export type Layer = "environment" | "repository" | "central" | "default";

/** One setting a tool reads: a folder or a file. */
export type Setting = {
  key: string;
  env: string | null;
  /** A few words to list it by on one line (kit 1.95.0); null from an older kit, or a repository's setting that gives none. */
  name?: string | null;
  description: string;
  kind: "folder" | "file";
  /** The game it belongs to, as the tools name it; null for every game. */
  game: string | null;
  /** phobos-modkit, or the repository that declares it for its own scripts. */
  declaredBy: string;
  value: string | null;
  layer: Layer;
  /** Which repository's own file sets it, when that is where the value comes from. */
  repository: string | null;
  central: string | null;
  default: string | null;
  /** Whether the value names something on this PC; null when there is no value. */
  exists: boolean | null;
  /** Every repository whose own file sets it, with its value. */
  overridden: { repository: string; value: string }[];
};

export type SettingsList = {
  central_file: string;
  central_exists: boolean;
  settings: Setting[];
};

export type SettingsReading = Waiting | { state: "ready"; list: SettingsList };

export type SetResult = {
  ok: boolean;
  refusal: string | null;
  central_file: string | null;
};
