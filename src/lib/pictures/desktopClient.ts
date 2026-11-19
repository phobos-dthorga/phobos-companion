import { ask } from "../shell/desktopClient";
import type { Failed } from "../shell/types";

/** Saves a picture into the owner's Pictures, in the Companion's own folder; where it went. */
export async function savePicture(
  bytes: Uint8Array,
  name: string,
): Promise<{ state: "ready"; path: string } | Failed> {
  return ask<string, { state: "ready"; path: string }>(
    "save_picture",
    bytes,
    (path) => ({ state: "ready", path }),
    { headers: { "x-picture-name": encodeURIComponent(name) } },
  );
}

/** Shows a saved picture in the file manager. */
export async function showPicture(
  path: string,
): Promise<{ state: "ready" } | Failed> {
  return ask<null, { state: "ready" }>("show_picture", { path }, () => ({
    state: "ready",
  }));
}
