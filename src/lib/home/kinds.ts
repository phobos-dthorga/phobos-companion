/**
 * What an entry on the owner's list is (0.24.0): a game, or a set of tools listed beside the games so their own work shows too
 * (the owner: the Companion "as its own game"). Tools have repositories, changelogs and history like any game, but no saves, log,
 * running game or game files.
 */
export type GameKind = "game" | "tools";

/** The pages about a game being played. A tools entry has none of what they read, so they say so instead of looking. */
export const GAME_ONLY_PAGES: readonly string[] = [
  "atlas",
  "logs",
  "memory",
  "gamefiles",
];

/** Whether a page has anything to show for an entry of this kind; an entry from an older list is a game. */
export function pageServes(kind: GameKind | undefined, page: string): boolean {
  return kind !== "tools" || !GAME_ONLY_PAGES.includes(page);
}
