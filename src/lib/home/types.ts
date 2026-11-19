import type { Failure, Waiting } from "../shell/types";
import type { GameKind } from "./kinds";

export type WorkItem = {
  repository: string;
  /** The commit's short hash (0.19.0), to open its code. */
  hash?: string;
  unix: number;
  subject: string;
};

export type Unfinished = { repository: string; files: number };

export type RepositoryProblem =
  "missing" | "not_a_repository" | "git_missing" | "git_failed";

export type Problem = {
  repository: string;
  problem: RepositoryProblem;
  detail: string;
};

export type PendingRelease = {
  product: string;
  repository: string;
  unreleased: number;
  draft_version: string | null;
  draft_date: string | null;
  earlier_drafts: number;
};

export type GameHome = {
  id: string;
  name: string;
  /** The repositories on the owner's list for this game, by name. */
  repositories: string[];
  /** A game or a set of tools (0.24.0); absent from an older host, meaning a game. */
  kind?: GameKind;
  last_worked: number | null;
  latest: WorkItem[];
  unfinished: Unfinished[];
  pending: PendingRelease[];
  open_work: string[];
  problems: Problem[];
};

export type Home = { list_found: boolean; games: GameHome[] };

export type HomeReading = Waiting | { state: "ready"; home: Home };

/** One repository's pin of the tool kit (kit 1.38.0 `pins`): its version, how far behind, and what a move would bring. */
export type KitPin = {
  repository: string;
  path: string;
  commit: string;
  version: string;
  kit: string;
  behind: number;
  ahead: boolean;
  versions: { version: string; heading: string; entries: string[] }[];
};

export type KitPins = { kit: string | null; pins: KitPin[] };
