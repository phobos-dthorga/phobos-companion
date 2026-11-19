import type { About } from "./types";

/**
 * Where the running program stands against its repository (0.25.0): a newer version is there to install, the repository has
 * changes not yet in a version, or the two are the same.
 */
export type Standing =
  | { kind: "newer"; version: string; installer: string | null }
  | { kind: "changes"; commits: number }
  | { kind: "current" }
  | { kind: "unknown" };

export function standing(about: About): Standing {
  if (about.newer.length > 0)
    return {
      kind: "newer",
      version: about.repository_version ?? about.newer[0].version,
      installer: about.installer,
    };
  if (about.commits_since === null) return { kind: "unknown" };
  if (about.commits_since > 0)
    return { kind: "changes", commits: about.commits_since };
  return { kind: "current" };
}

/** The entry on the owner's list that holds the program's own repository, for a link to its changelog. */
export function listedWith(
  games: { id: string; repositories?: string[] }[],
  repository: string,
): string | null {
  return games.find((g) => g.repositories?.includes(repository))?.id ?? null;
}
