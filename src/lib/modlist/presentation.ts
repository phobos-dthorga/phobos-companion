import type {
  ModBackup,
  ModListCheck,
  ModListInfo,
  ModProblem,
  Severity,
} from "./types";

export const SEVERITIES: readonly Severity[] = ["problem", "warning", "note"];

/** Each severity's heading and mark, written out so the words test can see every key. */
export const HEADING: Record<Severity, string> = {
  problem: "modlist-heading-problem",
  warning: "modlist-heading-warning",
  note: "modlist-heading-note",
};
export const MARK: Record<Severity, string> = {
  problem: "modlist-mark-problem",
  warning: "modlist-mark-warning",
  note: "modlist-mark-note",
};

/** Findings that are a Workshop item the owner may want to see in Steam: to subscribe, or to read why it went. */
const STEAM_KINDS: readonly string[] = [
  "missing",
  "needs",
  "removed",
  "unsubscribed",
];

/** The kit's backups record what each was kept before; going back keeps one too, which is never itself undone. */
export const BEFORE_GOING_BACK = "before going back";

/** One list with its findings by how much they matter; the version notes apart, since they come by the dozen. */
export type ListFindings = {
  list: ModListInfo;
  bySeverity: Record<Severity, ModProblem[]>;
  versions: ModProblem[];
};

export function findingsByList(check: ModListCheck): ListFindings[] {
  return check.lists.map((list) => {
    const mine = check.problems.filter((p) => p.list_key === list.key);
    const bySeverity = Object.fromEntries(
      SEVERITIES.map((s) => [
        s,
        mine.filter((p) => p.severity === s && p.kind !== "version"),
      ]),
    ) as Record<Severity, ModProblem[]>;
    return {
      list,
      bySeverity,
      versions: mine.filter((p) => p.kind === "version"),
    };
  });
}

/** Whether a finding names a Workshop item worth opening in Steam. */
export function steamWorthy(problem: ModProblem): boolean {
  return problem.workshop_id !== "" && STEAM_KINDS.includes(problem.kind);
}

/** The latest change the tools made to a list, which Undo would go back on; null when there is none. */
export function lastChange(
  check: ModListCheck,
  listKey: string,
): ModBackup | null {
  return (
    check.backups.find(
      (b) => b.list === listKey && b.why !== BEFORE_GOING_BACK && !b.undone,
    ) ?? null
  );
}

/** The number Home mentions: problems and warnings, or null when the game's list cannot be read or has neither. */
export function worthMentioning(check: ModListCheck | null): number | null {
  if (!check || !check.supported) return null;
  const count = check.counts.problem + check.counts.warning;
  return count > 0 ? count : null;
}

/** The kit's stamp (20261122T042900Z) as an ISO moment, or null when it is not one. */
export function stampMoment(stamp: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(stamp);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null;
}
