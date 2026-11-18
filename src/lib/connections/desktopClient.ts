import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { Answer, Question } from "./types";

/**
 * Asks the tools one question about how a repository's code connects. The host checks the repository, the thing's id, the commit
 * and the search before the tools see any of them.
 */
export async function askConnections<T>(
  game: string,
  repository: string,
  kind: Question,
  value: string | null,
  options: { depth?: number; onProgress?: OnProgress } = {},
): Promise<{ state: "ready"; answer: Answer<T> } | Failed> {
  return ask<Answer<T>, { state: "ready"; answer: Answer<T> }>(
    "connections",
    {
      game,
      repository,
      kind,
      value,
      depth: options.depth ?? null,
      onProgress: progressChannel(options.onProgress),
    },
    (answer) => ({ state: "ready", answer }),
  );
}
