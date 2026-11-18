import type { Failure } from "../shell/types";

/** One changelog entry, as phobos-modkit's installs status gives it (kit 1.20.0). */
export type Entry = {
  version: string;
  section: string;
  text: string;
  lead: string;
  aboutSaves: boolean;
};

/** What moving from one copy of a mod to another gains, loses and rewords, by their changelogs. */
export type Delta = {
  gain: Entry[];
  lose: Entry[];
  reworded: { now: Entry; would: Entry }[];
  saveNotes: Entry[];
  summaries: Record<string, string>;
};

/** Where an installed copy came from, written by the repository's install. */
export type InstallRecord = {
  format: number;
  mod: string;
  version: string;
  commit: string | null;
  uncommittedCount: number;
  installed: string;
};

export type Direction = "newer" | "older" | "same" | "unknown";

/** A copy of a mod: the repository's, the installed one, or a backup. */
export type Copy = {
  kind: "repository" | "installed" | "backup";
  name: string;
  version: string;
  record: InstallRecord | null;
  backup: string | null;
  taken: string | null;
  size: number | null;
  hasChangelog: boolean;
  direction: Direction | null;
};

export type Backup = Copy & { delta: Delta };

export type ModState =
  "not-installed" | "up-to-date" | "behind" | "ahead" | "differs";

export type ModInstall = {
  mod: string;
  name: string;
  state: ModState;
  repository: Copy;
  installed: Copy | null;
  update: Delta;
  uncommittedCount: number;
  commitsSince: number | null;
  backups: Backup[];
};

export type InstallsStatus = {
  repository: string;
  gameRunning: string[];
  space: {
    backups: number;
    backupsFree: number | null;
    targetFree: number | null;
    spare: number;
  };
  mods: ModInstall[];
};

export type RepositoryInstalls = {
  repository: string;
  status: InstallsStatus;
  command_line: string;
};

export type Move = "backup" | "restore" | "install";

export type MoveResult = {
  ok: boolean;
  title: string;
  refusal: string | null;
  data: { output?: string[]; backup?: string; replacedBy?: string | null };
};

export type InstallsReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; repositories: RepositoryInstalls[] }
  | { state: "failed"; failure: Failure };

export type MoveReading =
  | { state: "ready"; result: MoveResult }
  | { state: "failed"; failure: Failure };
