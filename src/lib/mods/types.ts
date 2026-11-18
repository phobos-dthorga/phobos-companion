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

/** A file installing would add, change or remove (kit 1.21.0). */
export type FileChange = {
  path: string;
  change: "added" | "changed" | "removed";
  category: string;
};

export type FileComparison = {
  total: number;
  counts: Record<string, number>;
  paths: FileChange[];
};

export type BuildState = {
  needsBuild: boolean;
  projects: {
    project: string;
    needsBuild: boolean;
    built: string | null;
    newest: string | null;
    newestFile: string | null;
  }[];
};

/** A setting an install would add, remove or give a new default, from the repository's own settings reader. */
export type SettingChange = {
  mod: string | null;
  class: string;
  key: string;
  label: string | null;
  what: "added" | "removed" | "default";
  before: string | null;
  after: string | null;
};

/** A test-list row an install would bring: still waiting, about a version between the installed one and the repository's. */
export type LookOut = { id: string; title: string; version: string };

export type ModInstall = {
  mod: string;
  name: string;
  /** The repository copy's changelog, as a path in the repository (kit 1.24.1), for showing an entry's code. */
  changelog: string;
  state: ModState;
  repository: Copy;
  installed: Copy | null;
  update: Delta;
  uncommittedCount: number;
  commitsSince: number | null;
  backups: Backup[];
  installedCommit: { commit: string; exact: boolean } | null;
  files: FileComparison | null;
  build: BuildState;
  settings: SettingChange[] | null;
  settingsNote: string | null;
  lookOut: LookOut[];
};

export type InstallsStatus = {
  repository: string;
  gameRunning: string[];
  canBuild: boolean;
  needsBuild: boolean;
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

export type Move = "backup" | "restore" | "install" | "build";

/** One active mod's encoded textures against its pictures (kit 1.21.0 rimworld-textures). */
export type TextureMod = {
  name: string;
  packageId: string;
  folderName: string;
  source: string;
  pictures: number;
  stale: number;
  missing: number;
  leftOver: number;
  stalePaths: string[];
  missingPaths: string[];
};

export type TexturesStatus = {
  checkedAt: string;
  gameRunning: string[];
  todds: string | null;
  totals: {
    mods: number;
    pictures: number;
    staleMods: number;
    missingMods: number;
    stale: number;
    missing: number;
    leftOver: number;
  };
  mods: TextureMod[];
};

export type TexturesReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "none" }
  | { state: "ready"; status: TexturesStatus }
  | { state: "failed"; failure: Failure };

export type MoveResult = {
  ok: boolean;
  title: string;
  refusal: string | null;
  data: {
    output?: string[];
    backup?: string;
    replacedBy?: string | null;
  };
};

export type InstallsReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; repositories: RepositoryInstalls[] }
  | { state: "failed"; failure: Failure };

export type MoveReading =
  | { state: "ready"; result: MoveResult }
  | { state: "failed"; failure: Failure };
