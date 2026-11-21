/**
 * When Check what they mean for ours last finished for a game (0.42.1), kept in the window's own storage, so Since you last played
 * keeps an update listed until a check has looked at it. Only a convenience: storage that is missing or refused means no check is
 * known, and the comparison reaches back a week instead.
 */
const PREFIX = "companion.since-checked.";

export function lastChecked(game: string): string | null {
  try {
    const text = localStorage.getItem(PREFIX + game);
    return text && Number.isFinite(Date.parse(text)) ? text : null;
  } catch {
    return null;
  }
}

export function rememberChecked(game: string, when: Date): void {
  try {
    localStorage.setItem(PREFIX + game, when.toISOString());
  } catch {
    // Storage full or refused: the next look reaches back a week, as with no check.
  }
}
