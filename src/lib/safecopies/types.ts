import type { Failed } from "../shell/types";

/** A set's state at one destination (phobos-modkit 1.66.0 `safe-copies status`). */
export interface DestinationState {
  state: "copied" | "changed since" | "never copied" | "refused" | "not ready";
  lastCopied?: string | null;
  changed?: number;
  files?: number;
  why?: string;
  problem?: string;
}

/** One set, or one training of a set, with its kind and its state at each destination. */
export interface SafeSet {
  set: string;
  unit: string | null;
  /** "personal" from kit 1.67.0: the owner's own but private, such as notes about them or a game's settings. */
  kind: "own" | "game-derived" | "personal" | string;
  why: string;
  files: number;
  bytes: number;
  destinations: Record<string, DestinationState>;
  neverCopied: boolean;
}

/** Where copies go: a plain folder, or a clone of a private repository. */
export interface SafeDestination {
  name: string;
  folder: string;
  problem: string | null;
  privateLocal: boolean;
  shared: string[];
  lastRun: { name: string; time: string | null } | null;
  /** Kit 1.69.0, the repository's copy: commits it holds that its remote has not had yet; null when git cannot say. */
  unsent?: number | null;
}

/** Kit 1.69.0: a copy kept of a file the list no longer takes, such as a save that left the newest pair. */
export interface KeptOnly {
  key: string;
  set: string;
  why: string;
  bytes: number;
  earlier: number;
  earlierBytes: number;
}

export interface SafeStatus {
  game: string;
  notes: string[];
  sets: SafeSet[];
  destinations: SafeDestination[];
  keptOnly?: KeptOnly[];
}

/** One repository of the game that lists safe copies, as the host read it. */
export interface RepositoryCopies {
  repository: string;
  status: SafeStatus;
  title: string;
  command_line: string;
}

/** What Copy now or Check the copies did. */
export interface CopyResult {
  ok: boolean;
  title: string;
  refusal: string | null;
  data: {
    results?: {
      destination: string;
      copied: { path: string; bytes: number }[];
      same: number;
      failed: { path: string; error: string }[];
      warnings: string[];
      git: {
        committed: boolean;
        pushed: boolean | null;
        error: string | null;
      } | null;
    }[];
    destinations?: {
      destination: string;
      checked: number;
      problems: { path: string; problem: string }[];
    }[];
    /** Restore (0.43.0): files copied back, files already there unchanged, files replaced. */
    restored?: number;
    same?: number;
    replaced?: number;
  };
}

export type SafeCopiesReading =
  | { state: "reading" }
  | { state: "browser" }
  | Failed
  | { state: "ready"; repositories: RepositoryCopies[] };

export type CopyReading = Failed | { state: "done"; result: CopyResult };
