import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { OtherAnswer } from "./types";

type Ready<T> = { state: "ready"; answer: OtherAnswer<T> };

/** A name's source (show) or the assembly declaring it (holder). Only reads. */
export async function askTheirCode<T>(
  game: string,
  repository: string,
  kind: "show" | "holder",
  name: string,
  onProgress?: OnProgress,
): Promise<Ready<T> | Failed> {
  return ask<OtherAnswer<T>, Ready<T>>(
    "their_code",
    { game, repository, kind, name, onProgress: progressChannel(onProgress) },
    (answer) => ({ state: "ready", answer }),
  );
}

/** Decompiles an assembly the tools named, on the owner's press. */
export async function decompileAssembly<T>(
  game: string,
  repository: string,
  assembly: string,
  onProgress?: OnProgress,
): Promise<Ready<T> | Failed> {
  return ask<OtherAnswer<T>, Ready<T>>(
    "decompile_assembly",
    { game, repository, assembly, onProgress: progressChannel(onProgress) },
    (answer) => ({ state: "ready", answer }),
  );
}

/** Keeps the new builds of the game and the mods a repository ties into, on the owner's press (0.28.0). */
export async function keepBuilds<T>(
  game: string,
  repository: string,
  onProgress?: OnProgress,
): Promise<Ready<T> | Failed> {
  return ask<OtherAnswer<T>, Ready<T>>(
    "keep_builds",
    { game, repository, onProgress: progressChannel(onProgress) },
    (answer) => ({ state: "ready", answer }),
  );
}

/** What the updates since a moment mean for a repository's code: our targets, temporary patches, update sizes and our XML
 *  patches (0.35.0). On the owner's press: it may decompile new builds. */
export async function checkUpdates<T>(
  game: string,
  repository: string,
  since: string | null,
  onProgress?: OnProgress,
): Promise<Ready<T> | Failed> {
  return ask<OtherAnswer<T>, Ready<T>>(
    "update_check",
    { game, repository, since, onProgress: progressChannel(onProgress) },
    (answer) => ({ state: "ready", answer }),
  );
}

/** Marks a temporary patch's update as read, or takes the mark back (`clear`), for a row and build the last check named
 *  (0.104.0). It writes only into the program's own folder. */
export async function markUpdateRead<T>(
  game: string,
  repository: string,
  row: string,
  build: string,
  clear: boolean,
): Promise<Ready<T> | Failed> {
  return ask<OtherAnswer<T>, Ready<T>>(
    "mark_update_read",
    { game, repository, row, build, clear },
    (answer) => ({ state: "ready", answer }),
  );
}

/** The builds kept (no file), or what one file's last update changed, and in one member of it. */
export async function askUpdates<T>(
  game: string,
  file: string | null,
  owner: string | null,
  member: string | null,
  onProgress?: OnProgress,
): Promise<Ready<T> | Failed> {
  return ask<OtherAnswer<T>, Ready<T>>(
    "updates",
    { game, file, owner, member, onProgress: progressChannel(onProgress) },
    (answer) => ({ state: "ready", answer }),
  );
}
