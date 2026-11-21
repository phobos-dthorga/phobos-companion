import type {
  CopyResult,
  DestinationState,
  RepositoryCopies,
  SafeSet,
} from "./types";

/** How many sets were never copied, and how many changed since their copy, across every repository. */
export function summarise(repositories: RepositoryCopies[]): {
  never: number;
  changed: number;
  sets: number;
} {
  const sets = repositories.flatMap((r) => r.status.sets);
  return {
    never: sets.filter((s) => s.neverCopied).length,
    changed: sets.filter(
      (s) =>
        !s.neverCopied &&
        Object.values(s.destinations).some((d) => d.state === "changed since"),
    ).length,
    sets: sets.length,
  };
}

/** The words for a set's kind. A kind this program does not know yet is said to be kept private, never to be ours. */
export function kindKey(kind: string): string {
  switch (kind) {
    case "own":
      return "safe-copies-kind-own";
    case "game-derived":
      return "safe-copies-kind-game-derived";
    case "personal":
      return "safe-copies-kind-personal";
    default:
      return "safe-copies-kind-other";
  }
}

/** A set's name as people read it: the set, then the training or file it stands for. */
export function setName(set: SafeSet): string {
  return set.unit ? `${set.set} / ${set.unit}` : set.set;
}

/** The locale key and its values for one cell: copied when, changed since when, never copied, not taken here, not ready. */
export function cellKey(state: DestinationState): {
  key: string;
  when: string | null;
  count: number;
} {
  switch (state.state) {
    case "copied":
      return {
        key: "safe-copies-state-copied",
        when: state.lastCopied ?? null,
        count: 0,
      };
    case "changed since":
      return state.lastCopied
        ? {
            key: "safe-copies-state-changed",
            when: state.lastCopied,
            count: state.changed ?? 0,
          }
        : { key: "safe-copies-state-never", when: null, count: 0 };
    case "never copied":
      return { key: "safe-copies-state-never", when: null, count: 0 };
    case "refused":
      return { key: "safe-copies-state-refused", when: null, count: 0 };
    default:
      return { key: "safe-copies-state-not-ready", when: null, count: 0 };
  }
}

/** Whether a set wants a look: never copied anywhere it may go, or changed since its copy. */
export function wantsCopy(set: SafeSet): boolean {
  return (
    set.neverCopied ||
    Object.values(set.destinations).some((d) => d.state === "changed since")
  );
}

/** What Copy now did, counted: files copied, left as they were, failed, and whether the repository's copy was sent. */
export function copyCounts(result: CopyResult): {
  copied: number;
  bytes: number;
  same: number;
  failed: number;
  firstProblem: string | null;
  sent: "sent" | "nothing-new" | "not-sent" | "none";
} {
  const results = result.data.results ?? [];
  const problems = results.flatMap((r) => [
    ...r.failed.map((f) => `${f.path}: ${f.error}`),
    ...r.warnings,
  ]);
  const git = results.find((r) => r.git)?.git ?? null;
  return {
    copied: results.reduce((n, r) => n + r.copied.length, 0),
    bytes: results.reduce(
      (n, r) => n + r.copied.reduce((m, c) => m + c.bytes, 0),
      0,
    ),
    same: results.reduce((n, r) => n + r.same, 0),
    failed: problems.length,
    firstProblem: problems[0] ?? null,
    sent:
      git === null
        ? "none"
        : git.pushed
          ? "sent"
          : git.error
            ? "not-sent"
            : "nothing-new",
  };
}

/** What Check the copies found: copies checked, and the first problem. */
export function checkCounts(result: CopyResult): {
  checked: number;
  problems: number;
  firstProblem: string | null;
} {
  const found = result.data.destinations ?? [];
  const problems = found.flatMap((d) =>
    d.problems.map((p) => `${p.path}: ${p.problem}`),
  );
  return {
    checked: found.reduce((n, d) => n + d.checked, 0),
    problems: problems.length,
    firstProblem: problems[0] ?? null,
  };
}
