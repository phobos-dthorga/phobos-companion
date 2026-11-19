import type { Ledger } from "./ledger";

/**
 * The last settings list read for a game, kept in the window's own storage (0.27.0), so the list shows at once when the page
 * opens and is checked for changes behind it: right after the program starts, the read can take a minute while everything
 * else starts too. Only a convenience: storage that is missing or refused just means waiting for the read, as before.
 */
const PREFIX = "companion.ledger.";

export function remembered(game: string): Ledger[] | null {
  try {
    const text = localStorage.getItem(PREFIX + game);
    if (!text) return null;
    const value = JSON.parse(text) as unknown;
    return Array.isArray(value) ? (value as Ledger[]) : null;
  } catch {
    return null;
  }
}

export function remember(game: string, ledgers: Ledger[]): void {
  try {
    localStorage.setItem(PREFIX + game, JSON.stringify(ledgers));
  } catch {
    // Storage full or refused: the next opening reads afresh, as before.
  }
}
