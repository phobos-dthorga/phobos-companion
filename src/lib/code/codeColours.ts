/**
 * The code colours in use (0.77.0; docs/code-reading.md, step 2): a set brought in from a VS Code theme, made readable on the theme
 * in use by the host (`companion_core::code_colours`), or none, when code takes the theme's own twelve code colours. The highlighter
 * reads it each time it colours code; anything showing code may listen, to colour its code again when it changes.
 */

/** One of the set's rules: the selectors it applies to, and its colour or style. Every colour is `#RRGGBB`, checked by the host. */
export type SetRule = {
  scope: string[];
  foreground?: string;
  fontStyle?: string;
};

/** A set in use, as the host made it ready for the theme in use. */
export type CodeSet = {
  id: string;
  name: string;
  plain: string;
  rules: SetRule[];
  /** How many of its colours took the theme's own, because they could not be read on it. */
  replaced: number;
  notes: string[];
};

/** A set as the highlighter is given it: its rules, and a key that changes whenever any of its colours do. */
export type SetForHighlighter = {
  key: string;
  plain: string;
  rules: SetRule[];
};

let active: SetForHighlighter | null = null;
const listeners = new Set<() => void>();

/** A short key for a set's whole content, so the highlighter knows a set changed when the theme under it did. */
function keyOf(set: CodeSet): string {
  const text = JSON.stringify([set.plain, set.rules]);
  let hash = 5381;
  for (let at = 0; at < text.length; at++)
    hash = ((hash * 33) ^ text.charCodeAt(at)) >>> 0;
  return `${set.id}-${hash.toString(36)}`;
}

/** Uses a set for code from now on, or the theme's own code colours (null), and tells everything that listens. */
export function useCodeColours(set: CodeSet | null): void {
  const next = set
    ? { key: keyOf(set), plain: set.plain, rules: set.rules }
    : null;
  if (next?.key === active?.key) return;
  active = next;
  for (const listener of listeners) listener();
}

export function activeCodeColours(): SetForHighlighter | null {
  return active;
}

/** Calls `listener` whenever the code colours in use change; the answer stops it. */
export function onCodeColours(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
