/**
 * The newest crash dump the person said Got it to (0.105.0), kept in the window's own storage. Only a convenience: storage that is
 * missing or refused means nothing was seen, and Home shows the last week's crashes again.
 */
const KEY = "companion.crash-seen";

export function lastSeen(): string | null {
  try {
    const text = localStorage.getItem(KEY);
    return text && Number.isFinite(Date.parse(text)) ? text : null;
  } catch {
    return null;
  }
}

export function rememberSeen(time: string): void {
  try {
    localStorage.setItem(KEY, time);
  } catch {
    // Storage full or refused: the same crashes show again next time, which is safe.
  }
}
