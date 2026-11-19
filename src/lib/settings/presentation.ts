import type { Setting } from "./types";

/** Settings grouped by the game they belong to: every game's first, then each game's, in the order the tools list them. */
export function byGame(
  settings: Setting[],
): { game: string | null; settings: Setting[] }[] {
  const groups: { game: string | null; settings: Setting[] }[] = [];
  for (const setting of settings) {
    let group = groups.find((g) => g.game === setting.game);
    if (!group) {
      group = { game: setting.game, settings: [] };
      groups.push(group);
    }
    group.settings.push(setting);
  }
  return groups.sort((a, b) =>
    a.game === null ? -1 : b.game === null ? 1 : 0,
  );
}

/**
 * A path as it will be saved (0.26.1): spaces at either end and one pair of quotes around it taken off, since Explorer's "Copy as
 * path" (Ctrl+Shift+C) puts quotes round what it copies, and the tools refused a quoted path as not a full path.
 */
export function cleanPath(value: string): string {
  const trimmed = value.trim();
  const quoted = /^(["'])(.*)\1$/.exec(trimmed);
  return (quoted ? quoted[2] : trimmed).trim();
}

/** A value worth sending: one line, not empty. The host and the kit check the rest (a full path, a sane length). */
export function sendable(value: string): boolean {
  const trimmed = cleanPath(value);
  return trimmed.length > 0 && !/[\r\n]/.test(trimmed);
}

/** The repositories whose own file sets a value other than the one in force: there, a central value would not apply. */
export function otherRepositories(setting: Setting) {
  return setting.overridden.filter(
    (own) =>
      own.repository !== setting.repository || own.value !== setting.value,
  );
}
