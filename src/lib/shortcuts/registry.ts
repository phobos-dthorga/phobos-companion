import type { Scope } from "./actions";
import { actionFor, type Saved } from "./bindings";
import { belongsElsewhere, keyOf } from "./keys";

/** What one view's keys do while it is on screen, and whether it lives in a dialog. */
export type Handlers = {
  scope: Scope;
  inDialog: boolean;
  run: Record<string, () => void>;
};

const registered: Handlers[] = [];

/** Listens for a view's actions until the returned function is called, as the view leaves the screen. */
export function register(handlers: Handlers): () => void {
  registered.push(handlers);
  return () => {
    const index = registered.indexOf(handlers);
    if (index >= 0) registered.splice(index, 1);
  };
}

/**
 * Does what a key press asks, if anything: never while typing in a box or in a part that takes keys itself, never when something
 * else has already handled the press, and while a dialog is open only what that dialog offers. The newest view to offer an
 * action does it. Returns whether the press did something.
 */
export function dispatch(
  event: Pick<
    KeyboardEvent,
    | "key"
    | "ctrlKey"
    | "altKey"
    | "metaKey"
    | "target"
    | "defaultPrevented"
    | "preventDefault"
  >,
  saved: Saved,
  dialogOpen: boolean,
): boolean {
  if (event.defaultPrevented || belongsElsewhere(event.target)) return false;
  const key = keyOf(event);
  if (!key) return false;
  const live = registered.filter((h) => h.inDialog === dialogOpen);
  const id = actionFor(key, saved, new Set(live.map((h) => h.scope)));
  if (!id) return false;
  for (let index = live.length - 1; index >= 0; index--) {
    const run = live[index].run[id];
    if (run) {
      event.preventDefault();
      run();
      return true;
    }
  }
  return false;
}
