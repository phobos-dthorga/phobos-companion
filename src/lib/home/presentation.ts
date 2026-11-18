import { daysSince, formatIsoDate, formatUnixDate } from "../shell/dates";
import type { GameHome, PendingRelease, RepositoryProblem } from "./types";

export {
  daysSince,
  formatDate,
  formatIsoDate,
  formatTime,
  formatUnixDate,
} from "../shell/dates";

export type Words = { key: string; args?: Record<string, string | number> };

/** The short "when" beside a game's name. */
export function whenWords(lastWorked: number | null, now: Date): Words {
  if (lastWorked === null) return { key: "when-never" };
  const days = daysSince(lastWorked, now);
  if (days === 0) return { key: "when-today" };
  if (days === 1) return { key: "when-yesterday" };
  return { key: "when-days", args: { count: days } };
}

/** The page's opening sentence. */
export function headlineWords(game: GameHome, now: Date): Words {
  if (game.last_worked === null) {
    return { key: "headline-never", args: { game: game.name } };
  }
  const days = daysSince(game.last_worked, now);
  if (days === 0) return { key: "headline-today", args: { game: game.name } };
  if (days === 1) {
    return { key: "headline-yesterday", args: { game: game.name } };
  }
  return { key: "headline-days", args: { game: game.name, count: days } };
}

/** What a changelog has waiting. */
export function pendingWords(pending: PendingRelease): Words {
  if (pending.draft_version === null) {
    return { key: "pending-unreleased", args: { count: pending.unreleased } };
  }
  if (pending.draft_date === null) {
    return {
      key: "pending-draft-undated",
      args: { version: pending.draft_version },
    };
  }
  return {
    key: "pending-draft",
    args: {
      version: pending.draft_version,
      date: formatIsoDate(pending.draft_date),
    },
  };
}

const PROBLEMS: Record<RepositoryProblem, string> = {
  missing: "repo-problem-missing",
  not_a_repository: "repo-problem-not-a-repository",
  git_missing: "repo-problem-git-missing",
  git_failed: "repo-problem-git-failed",
};

export function problemKey(problem: string): string {
  return PROBLEMS[problem as RepositoryProblem] ?? "repo-problem-git-failed";
}
