import { heard, started, type ProgressState } from "../shell/progress";
import { startWatch } from "./desktopClient";
import type { ReportReading, StartChoice } from "./types";

/**
 * A watch this window started, kept outside the page so it carries on when the owner changes page or game: the request lasts as
 * long as the watch (up to an hour), its progress fills the bar, and its report arrives when it ends. A watch started elsewhere
 * (another window, a console) is followed through its status instead.
 */
export type Started = {
  game: string;
  progress: ProgressState;
  /** Null while the watch runs; its report, or the failure, once it ends. */
  ended: ReportReading | null;
};

export const watching = $state<{ started: Started | null }>({ started: null });

/** Starts a watch for a game and follows it to its end. Resolves when it ends. */
export async function beginWatch(
  game: string,
  choice: StartChoice,
  label: string,
): Promise<ReportReading> {
  watching.started = { game, progress: started(label), ended: null };
  const ended = await startWatch(game, choice, (message) => {
    if (watching.started?.game === game)
      watching.started.progress = heard(watching.started.progress, message);
  });
  if (watching.started?.game === game) watching.started.ended = ended;
  return ended;
}

/** The watch this window started for a game, if it did. */
export function startedFor(game: string): Started | null {
  return watching.started?.game === game ? watching.started : null;
}
