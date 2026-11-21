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
  kind: "own" | "game-derived";
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
}

export interface SafeStatus {
  game: string;
  notes: string[];
  sets: SafeSet[];
  destinations: SafeDestination[];
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
  };
}

export type SafeCopiesReading =
  | { state: "reading" }
  | { state: "browser" }
  | Failed
  | { state: "ready"; repositories: RepositoryCopies[] };

export type CopyReading = Failed | { state: "done"; result: CopyResult };
