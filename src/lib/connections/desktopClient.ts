import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { Answer, Changed, Question } from "./types";
import type { PatchTargets } from "./patches";

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

type ChangedAsked = { state: "ready"; answer: Answer<Changed> } | Failed;
const changedAsked = new Map<string, Promise<ChangedAsked>>();

/**
 * The things a commit changed (0.78.0): asked once a window's run for each commit, so the code viewer's lines and its connections
 * picture share one answer. A failure is not kept, so asking again tries again.
 */
export function askChanged(
  game: string,
  repository: string,
  commit: string,
  onProgress?: OnProgress,
): Promise<ChangedAsked> {
  const key = JSON.stringify([game, repository, commit]);
  let asked = changedAsked.get(key);
  if (!asked) {
    asked = askConnections<Changed>(game, repository, "changed", commit, {
      onProgress,
    });
    changedAsked.set(key, asked);
    void asked.then((answer) => {
      if (answer.state === "failed") changedAsked.delete(key);
    });
  }
  return asked;
}

/** The methods a repository patches, with the other mods on each and what the last update changed (kit 1.37.1), or a failure. */
export async function readPatchTargets(
  game: string,
  repository: string,
): Promise<PatchTargets | Failed> {
  return ask<PatchTargets, PatchTargets>(
    "patch_targets",
    { game, repository, onProgress: progressChannel() },
    (answer) => answer,
  );
}
