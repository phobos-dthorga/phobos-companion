import type { Failure } from "../shell/types";

/** One entry of a changelog, as phobos-modkit reads it. */
export type ChangelogEntry = {
  version: string;
  section: string;
  text: string;
  lead: string;
  aboutSaves: boolean;
};

export type ChangelogVersion = {
  version: string;
  /** What follows the version in its heading, such as "2026-11-18 - Draft". */
  heading: string;
  summary: string;
  entries: ChangelogEntry[];
};

/** One changelog of a repository: a mod's, or the repository's own. */
export type ChangelogList = {
  changelog: string;
  product: string;
  versionsInAll: number;
  versions: ChangelogVersion[];
};

export type RepositoryChanges = {
  repository: string;
  changelogs: ChangelogList[];
};

/** One line of a diff: added, removed or unchanged, with its line number on each side. */
export type DiffLine = {
  kind: "+" | "-" | " ";
  old: number | null;
  new: number | null;
  text: string;
};

export type Hunk = { header: string; lines: DiffLine[] };

export type FileKind = "code" | "data" | "words" | "other";

export type FileChange = {
  path: string;
  oldPath: string | null;
  change: "added" | "changed" | "removed" | "renamed";
  kind: FileKind;
  /** What the file is (csharp, lua, xml...), named by the kit; never a colour. */
  language: string;
  binary: boolean;
  additions: number;
  deletions: number;
  hunks: Hunk[];
  truncated: boolean;
};

/** The code behind one changelog entry (phobos-modkit `changes entry`, kit 1.24.0). */
export type EntryCodeData = {
  repository: string;
  changelog: string;
  /** Null when the entry is in no commit yet: the files are then the uncommitted changes. */
  commit: {
    hash: string;
    time: string | null;
    author: string;
    subject: string;
  } | null;
  /** The other entries the same commit wrote, as written. */
  writtenWith: string[];
  files: FileChange[];
  filesLeftOut: number;
  additions: number;
  deletions: number;
};

export type EntryCode = {
  found: boolean;
  refusal: string | null;
  code: EntryCodeData;
  command_line: string;
};

/** Which entry's code to show: where its changelog is, and the entry itself. */
export type EntryRequest = {
  repository: string;
  changelog: string;
  product: string;
  entry: Pick<ChangelogEntry, "version" | "section" | "text" | "lead">;
};

export type ChangesReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; repositories: RepositoryChanges[] }
  | { state: "failed"; failure: Failure };

export type EntryCodeReading =
  | { state: "reading" }
  | { state: "ready"; found: EntryCode }
  | { state: "failed"; failure: Failure };
