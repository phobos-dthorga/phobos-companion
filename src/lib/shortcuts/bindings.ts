import { ACTIONS, action, together } from "./actions";
import { RESERVED } from "./keys";

/** What the owner saved: only what differs from the defaults, and whether shortcuts are on at all. */
export type Saved = {
  format: 1;
  enabled: boolean;
  /** An action's key, or null when the owner turned it off. Actions not named keep their default. */
  keys: Record<string, string | null>;
};

export const NOTHING_SAVED: Saved = { format: 1, enabled: true, keys: {} };

/** Every action's key now: the default, unless the owner changed it. */
export function keysNow(saved: Saved): Map<string, string | null> {
  return new Map(
    ACTIONS.map((a) => [
      a.id,
      a.id in saved.keys ? saved.keys[a.id] : a.defaultKey,
    ]),
  );
}

/** The action a key does in the scopes that are working; none when shortcuts are off or the key does nothing there. */
export function actionFor(
  key: string,
  saved: Saved,
  scopes: Set<string>,
): string | null {
  if (!saved.enabled) return null;
  for (const [id, bound] of keysNow(saved)) {
    if (bound === key && scopes.has(action(id)!.scope)) return id;
  }
  return null;
}

/**
 * Why a key cannot be given to an action, or null when it can. A key is checked against every action whose scope can work at the
 * same moment as this one's (0.55.0: a key may repeat in places never on screen together); a page's actions and the connections
 * view's work at the same time, so they never share one.
 */
export function refusal(
  id: string,
  key: string,
  saved: Saved,
): { reason: "reserved" } | { reason: "taken"; by: string } | null {
  if (RESERVED.has(key)) return { reason: "reserved" };
  const scope = action(id)?.scope;
  for (const [other, bound] of keysNow(saved)) {
    const otherScope = action(other)?.scope;
    if (other === id || bound !== key || !scope || !otherScope) continue;
    if (together(scope, otherScope)) return { reason: "taken", by: other };
    // Two keys the system holds (0.122.1) work together wherever their pages are, so they never share a key.
    if (action(id)?.system && action(other)?.system)
      return { reason: "taken", by: other };
  }
  return null;
}

/** The saved set with one action's key changed; a key equal to the default is not stored. */
export function withKey(saved: Saved, id: string, key: string | null): Saved {
  const keys = { ...saved.keys };
  if (key === action(id)?.defaultKey) delete keys[id];
  else keys[id] = key;
  return { ...saved, keys };
}

/** The saved set with one action back to its default. */
export function withDefault(saved: Saved, id: string): Saved {
  const keys = { ...saved.keys };
  delete keys[id];
  return { ...saved, keys };
}

/** Whatever came back from the file, made safe to use: an unknown action is dropped, a malformed file is no change. */
export function fromFile(value: unknown): Saved {
  if (!value || typeof value !== "object") return NOTHING_SAVED;
  const raw = value as Partial<Saved>;
  const keys: Record<string, string | null> = {};
  for (const [id, key] of Object.entries(raw.keys ?? {})) {
    if (action(id) && (key === null || typeof key === "string")) keys[id] = key;
  }
  return { format: 1, enabled: raw.enabled !== false, keys };
}
