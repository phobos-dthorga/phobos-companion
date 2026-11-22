import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { OnlineStatus, RepoStatusAnswer } from "./types";

type Read = { state: "ready"; status: OnlineStatus } | Failed;
const ready = (status: OnlineStatus) => ({ state: "ready" as const, status });

/** Which kinds of online call the program may make by itself (0.61.0). */
export async function readOnline(): Promise<Read | typeof BROWSER> {
  if (inBrowser()) return BROWSER;
  return ask<OnlineStatus, Read>("online_status", {}, ready);
}

/** Keeps the person's choice for one kind: on or off. */
export async function chooseOnline(kind: string, on: boolean): Promise<Read> {
  return ask<OnlineStatus, Read>("choose_online", { kind, on }, ready);
}

type Lights = { state: "ready"; lights: RepoStatusAnswer } | Failed;

/** A game's repositories with their remotes, and GitHub's checks while Gate lights is on. `pressed` is Look now. */
export async function readRepoStatus(
  game: string,
  pressed: boolean,
  onProgress?: OnProgress,
): Promise<Lights | typeof BROWSER> {
  if (inBrowser()) return BROWSER;
  return ask<RepoStatusAnswer, Lights>(
    "repo_status",
    { game, pressed, onProgress: progressChannel(onProgress) },
    (lights) => ({ state: "ready", lights }),
  );
}
