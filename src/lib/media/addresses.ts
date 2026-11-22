import { readViewable } from "./desktopClient";

/**
 * An address an `<img>` can show for a picture a page listed (0.55.0, from the Mod list's previews of 0.53.0): read from the host
 * once per path and kept for this run, so moving back and forth through a list reads nothing twice. Null when it could not be read.
 * Only pictures a browser draws itself: a DDS texture goes through `MediaCompare`.
 */
const made = new Map<string, Promise<string | null>>();

export function pictureAddress(path: string): Promise<string | null> {
  let found = made.get(path);
  if (!found) {
    found = readViewable(path).then((answer) =>
      answer.state === "ready"
        ? URL.createObjectURL(new Blob([answer.bytes as BlobPart]))
        : null,
    );
    made.set(path, found);
  }
  return found;
}
