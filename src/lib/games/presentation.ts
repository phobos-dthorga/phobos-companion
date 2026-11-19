import type { NewGame, SteamGame } from "./types";

/** The longest id the host accepts (`games::MAX_ID`). */
export const MAX_ID = 40;

/**
 * A short id for a game's name, as the list's ids are written: lower case, "and" for "&", dashes between words, nothing else.
 * "Workers & Resources: Soviet Republic" gives "workers-and-resources-soviet-republic".
 */
export function idFor(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_ID)
    .replace(/-+$/, "");
}

/** An id the host would take: lower-case letters, digits and dashes, starting with a letter or digit, not already used. */
export function idProblem(
  id: string,
  taken: string[],
): "shape" | "taken" | null {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || id.length > MAX_ID) return "shape";
  return taken.includes(id) ? "taken" : null;
}

/** Steam's games, those not on the list first, each part by name; Steam's own tools (redistributables) last. */
export function offered(games: SteamGame[]): SteamGame[] {
  const rank = (g: SteamGame) =>
    (g.listedAs ? 1 : 0) + (/redistributable/i.test(g.name) ? 2 : 0);
  return [...games].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
  );
}

/** The entry as the host will write it into the list, for the owner to see before pressing Add. */
export function preview(game: NewGame): string {
  const entry: Record<string, unknown> = {
    id: game.id,
    name: game.name.trim(),
    repositories: game.repositories,
  };
  if (game.steam_app_id !== null) entry.steam_app_id = game.steam_app_id;
  if (game.data) entry.places = { data: game.data };
  return JSON.stringify(entry, null, 2);
}
