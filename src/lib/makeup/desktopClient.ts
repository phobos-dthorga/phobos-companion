import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";

export type MakeupQuestion = "now" | "growth" | "churn" | "census";

/** Asks the tools one question about what a repository is made of. The host checks the repository and the question first. */
export async function askMakeup<T>(
  game: string,
  repository: string,
  kind: MakeupQuestion,
  options: { days?: number; onProgress?: OnProgress } = {},
): Promise<{ state: "ready"; data: T } | Failed> {
  return ask<T, { state: "ready"; data: T }>(
    "makeup",
    {
      game,
      repository,
      kind,
      days: options.days ?? null,
      onProgress: progressChannel(options.onProgress),
    },
    (data) => ({ state: "ready", data }),
  );
}
