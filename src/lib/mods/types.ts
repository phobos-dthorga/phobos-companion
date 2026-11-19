import type { Failure, Waiting } from "../shell/types";

/** One changelog entry, as phobos-modkit's installs status gives it (kit 1.20.0). */
export type Entry = {
  version: string;
  section: string;
  text: string;
  lead: string;
  aboutSaves: boolean;
  /** The commit that wrote it, its hash's first 12 characters, or null when no commit holds it yet (kit 1.26.0). */
  commit?: string | null;
};

/** What moving from one copy of a mod to another gains, loses and rewords, by their changelogs. */
export type Delta = {
  gain: Entry[];
  lose: Entry[];
  reworded: { now: Entry; would: Entry }[];
  saveNotes: Entry[];
  summaries: Record<string, string>;
  /**
   * Installing from the repository only (kit 1.53.0): entries the repository's changelog does not hold now, which a changelog
   * cannot call lost. They are not in `lose`.
   */
  unlisted?: Entry[];
  /** Why, by version: a number used twice, or installed from uncommitted work the repository's changelog no longer lists. */
  unlistedWhy?: Record<string, UnlistedWhy>;
};

export type UnlistedWhy = "reused" | "uncommitted";

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
  /** For a backup that repeats the one before it (kit 1.40.0): the oldest backup of its run, kept. */
  sameAs?: string | null;
  /** How it repeats it: the same file for file, or only rebuilt from unchanged sources. */
  sameKind?: "identical" | "rebuilt" | null;
};

export type Backup = Copy & { delta: Delta };

export type ModState =
  | "not-installed"
  | "up-to-date"
  | "behind"
  | "ahead"
  | "differs"
  /** The only difference is entries the repository's changelog does not hold now, set aside from `lose` (kit 1.53.0). */
  | "unlisted"
  /** The changelogs agree, and every changed file was only rebuilt from unchanged code (kit 1.26.0). */
  | "rebuilt"
  /** The changelogs agree, but files differ that no entry describes. */
  | "unlogged";

/** A file installing would add, change or remove (kit 1.21.0). */
export type FileChange = {
  path: string;
  change: "added" | "changed" | "removed";
  /** An assembly whose own code is unchanged since the installed commit: built again, at another commit or against newer code. */
  rebuilt?: boolean;
  /** For another changed assembly, the sources that changed since the installed commit, up to five (kit 1.27.0). */
  sources?: string[];
  sourcesInAll?: number;
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
    /** Backups that repeat the one before them, and their size (kit 1.40.0). */
    duplicates?: number;
    duplicatesSize?: number;
  };
  mods: ModInstall[];
};

export type RepositoryInstalls = {
  repository: string;
  status: InstallsStatus;
  command_line: string;
};

export type Move = "backup" | "restore" | "install" | "build" | "dedupe";

/** One active mod's encoded textures against its pictures (kit 1.21.0 rimworld-textures; unpacked from kit 1.57.0). */
export type TextureMod = {
  name: string;
  packageId: string;
  folderName: string;
  source: string;
  pictures: number;
  stale: number;
  missing: number;
  leftOver: number;
  /** Encoded textures Waylith unpacks at four times the memory, which encoding keeps compressed. */
  unpacked: number;
  stalePaths: string[];
  missingPaths: string[];
  unpackedPaths: string[];
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
    unpackedMods: number;
    stale: number;
    missing: number;
    unpacked: number;
    leftOver: number;
  };
  mods: TextureMod[];
};

export type TexturesReading =
  Waiting | { state: "none" } | { state: "ready"; status: TexturesStatus };

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
  Waiting | { state: "ready"; repositories: RepositoryInstalls[] };

export type MoveReading =
  | { state: "ready"; result: MoveResult }
  | { state: "failed"; failure: Failure };
