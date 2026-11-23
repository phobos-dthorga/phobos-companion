import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { Answer, Calls, Changed, Names, Question } from "./types";
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
  options: { depth?: number; commit?: string; onProgress?: OnProgress } = {},
): Promise<{ state: "ready"; answer: Answer<T> } | Failed> {
  return ask<Answer<T>, { state: "ready"; answer: Answer<T> }>(
    "connections",
    {
      game,
      repository,
      kind,
      value,
      depth: options.depth ?? null,
      commit: options.commit ?? null,
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

type NamesAsked = { state: "ready"; answer: Answer<Names> } | Failed;
const namesAsked = new Map<string, Promise<NamesAsked>>();

/**
 * Every name in one C# file, at a commit or as it stands (0.79.0; kit 1.111.0's names reader, Roslyn): read once a window's run for
 * each file and commit, since a reading takes a few seconds. A failure is not kept.
 */
export function askNames(
  game: string,
  repository: string,
  file: string,
  commit: string | null,
): Promise<NamesAsked> {
  const key = JSON.stringify([game, repository, file, commit]);
  let asked = namesAsked.get(key);
  if (!asked) {
    asked = askConnections<Names>(game, repository, "names", file, {
      commit: commit ?? undefined,
    });
    namesAsked.set(key, asked);
    void asked.then((answer) => {
      if (answer.state === "failed") namesAsked.delete(key);
    });
  }
  return asked;
}

type CallsAsked = { state: "ready"; answer: Answer<Calls> } | Failed;
const callsAsked = new Map<string, Promise<CallsAsked>>();

/**
 * What a commit did to its C# methods' calls, and the rings it made or cut (0.82.0; kit 1.116.0): read once a window's run for each
 * commit, since the methods are read twice with Roslyn. The host names the game, so its own assemblies may be read. A failure is
 * not kept.
 */
export function askCalls(
  game: string,
  repository: string,
  commit: string,
  onProgress?: OnProgress,
): Promise<CallsAsked> {
  const key = JSON.stringify([game, repository, commit]);
  let asked = callsAsked.get(key);
  if (!asked) {
    asked = askConnections<Calls>(game, repository, "calls", commit, {
      onProgress,
    });
    callsAsked.set(key, asked);
    void asked.then((answer) => {
      if (answer.state === "failed") callsAsked.delete(key);
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
