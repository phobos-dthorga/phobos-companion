import type { Failure } from "../shell/types";
import { fromFile, NOTHING_SAVED, type Saved } from "./bindings";
import { readShortcuts, saveShortcuts } from "./desktopClient";

/** The owner's shortcuts as the whole window uses them: the defaults until the saved ones are read. */
export const shortcuts = $state<{ saved: Saved; readFailure: Failure | null }>({
  saved: NOTHING_SAVED,
  readFailure: null,
});

export async function loadShortcuts() {
  const read = await readShortcuts();
  if (read.state === "ready") shortcuts.saved = fromFile(read.value);
  else if (read.state === "failed") shortcuts.readFailure = read.failure;
}

/** Saves a changed set and uses it at once; the failure, if the host could not save it. */
export async function keepShortcuts(next: Saved): Promise<Failure | null> {
  const saved = await saveShortcuts(next);
  if (saved.state === "failed") return saved.failure;
  shortcuts.saved = fromFile(saved.value);
  shortcuts.readFailure = null;
  return null;
}
