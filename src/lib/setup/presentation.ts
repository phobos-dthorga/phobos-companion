import type {
  Fetching,
  Readiness,
  SetupRow,
  SetupState,
  StarterField,
  StarterState,
} from "./types";

/** The order the Setup tab shows its groups in: what is missing first, then what is here, then what was set aside. */
export const GROUPS: SetupState[] = ["missing", "here", "set-aside"];

/** The rows of one group, everyday ones first, then by name. */
export function inGroup(rows: SetupRow[], state: SetupState): SetupRow[] {
  return rows
    .filter((row) => row.state === state)
    .sort(
      (a, b) =>
        Number(b.everyday) - Number(a.everyday) || a.name.localeCompare(b.name),
    );
}

/** What Home names (0.87.0): the everyday programs missing and not set aside (Steam, and since 0.92.0 the .NET 10 runtime, as the
 * tool kit marks them). git is said on every page already, so not here too. */
export function homeNeeds(rows: SetupRow[]): SetupRow[] {
  return rows.filter(
    (row) => row.state === "missing" && row.everyday && row.key !== "git",
  );
}

/**
 * What a page names (0.88.0): the programs it uses that are not here, set aside or not (the page can't work without them either
 * way). A game's own program only on that game's pages; git never, since every page says so already.
 */
export function pageNeeds(
  rows: SetupRow[],
  page: string,
  game: string | null,
): SetupRow[] {
  return rows.filter(
    (row) =>
      row.state !== "here" &&
      row.key !== "git" &&
      row.pages.includes(page) &&
      (row.game === null || row.game === game),
  );
}

/** The starter files a repository is offered (0.89.0): those it lacks, and one for agent sessions only while those show. */
export function offered(
  repository: Readiness,
  agentsShown: boolean,
): StarterState[] {
  return repository.starters.filter(
    (starter) =>
      !starter.present &&
      starter.unavailable === null &&
      (agentsShown || !starter.forAgents),
  );
}

/** The fields a person fills in a starter's form (0.93.0): all but the game, which the repository's own entry gives. */
export function shownFields(starter: StarterState): StarterField[] {
  return (starter.fields ?? []).filter((field) => field.kind !== "game");
}

/** A form's values as first offered: each field's default. */
export function defaults(starter: StarterState): Record<string, string> {
  return Object.fromEntries(
    shownFields(starter).map((field) => [field.id, field.default ?? ""]),
  );
}

/** What a missing row offers: run its command, wait for another program, get its page by hand, or nothing. */
export type Offer =
  | { kind: "run" }
  | { kind: "waits"; names: string[] }
  | { kind: "no-fetcher"; fetcher: string }
  | { kind: "page-only" }
  | { kind: "nothing" };

export function offer(row: SetupRow): Offer {
  if (row.command && row.waitsFor.length > 0)
    return { kind: "waits", names: row.waitsFor };
  if (row.command && row.fetcher && !row.fetcherHere)
    return { kind: "no-fetcher", fetcher: row.fetcher };
  if (row.command) return { kind: "run" };
  return row.page ? { kind: "page-only" } : { kind: "nothing" };
}

/** How a fetch stands: running, finished well, or ended otherwise (with its code, or stopped). */
export type FetchOutcome =
  | { kind: "running" }
  | { kind: "done" }
  | { kind: "failed"; code: number }
  | { kind: "stopped" };

export function outcome(fetching: Fetching): FetchOutcome {
  const ended = fetching.ended;
  if (!ended) return { kind: "running" };
  if (ended.exitCode === 0) return { kind: "done" };
  if (ended.exitCode === null) return { kind: "stopped" };
  return { kind: "failed", code: ended.exitCode };
}

/** Whether the row a fetch was for is now here: a fetch that finished is only believed once the tools find the program. */
export function arrived(fetching: Fetching, rows: SetupRow[]): boolean {
  return rows.some((row) => row.key === fetching.key && row.state === "here");
}
