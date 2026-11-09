import type { Failure } from "../shell/types";

export type WorkItem = { repository: string; unix: number; subject: string };

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
  last_worked: number | null;
  latest: WorkItem[];
  unfinished: Unfinished[];
  pending: PendingRelease[];
  open_work: string[];
  problems: Problem[];
};

export type Home = { list_found: boolean; games: GameHome[] };

export type HomeReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; home: Home }
  | { state: "failed"; failure: Failure };
