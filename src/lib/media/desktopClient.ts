import { ask } from "../shell/desktopClient";
import type { Failed } from "../shell/types";

/**
 * A picture or a sound a page listed, raw (0.53.0): an installed or a repository's copy of a mod's file, a mod's preview, a picture
 * or its encoded texture. The host hands over only a file a kit answer named in this run.
 */
export async function readViewable(
  path: string,
): Promise<{ state: "ready"; bytes: Uint8Array } | Failed> {
  return ask<ArrayBuffer | number[], { state: "ready"; bytes: Uint8Array }>(
    "viewable_file",
    { path },
    (raw) => ({
      state: "ready",
      bytes:
        raw instanceof ArrayBuffer ? new Uint8Array(raw) : Uint8Array.from(raw),
    }),
  );
}

/** A file inside a folder, as the host names it: the folder, then the kit's relative path. */
export function inFolder(folder: string, relative: string): string {
  return `${folder.replace(/[\/]+$/, "")}/${relative}`;
}
