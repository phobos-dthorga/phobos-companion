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
