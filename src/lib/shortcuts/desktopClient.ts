import { ask, inBrowser } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { Saved } from "./bindings";

/** The owner's saved shortcuts, as the host reads them from this program's own folder; null before any were saved. */
export async function readShortcuts(): Promise<
  { state: "ready"; value: unknown } | { state: "browser" } | Failed
> {
  if (inBrowser()) return { state: "browser" };
  return ask<unknown, { state: "ready"; value: unknown }>(
    "read_shortcuts",
    {},
    (value) => ({ state: "ready", value }),
  );
}

/** Saves the owner's shortcuts; the host checks their shape first. */
export async function saveShortcuts(
  shortcuts: Saved,
): Promise<{ state: "ready"; value: unknown } | Failed> {
  return ask<unknown, { state: "ready"; value: unknown }>(
    "save_shortcuts",
    { shortcuts },
    (value) => ({ state: "ready", value }),
  );
}
