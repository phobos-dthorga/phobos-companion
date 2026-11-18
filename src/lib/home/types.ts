import type { Failure, Waiting } from "../shell/types";

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
  last_worked: number | null;
  latest: WorkItem[];
  unfinished: Unfinished[];
  pending: PendingRelease[];
  open_work: string[];
  problems: Problem[];
};

export type Home = { list_found: boolean; games: GameHome[] };

export type HomeReading = Waiting | { state: "ready"; home: Home };
