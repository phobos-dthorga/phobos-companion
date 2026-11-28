import { heard, started, type ProgressState } from "../shell/progress";
import { recordGame } from "./desktopClient";
import type { GameRecorded, RecordChoice, ReportReading } from "./types";

/**
 * A recording running from this window, kept outside the page so it carries on when the owner changes page or game (0.118.0):
 * one started on the page, with its progress, or one started by the key in the game, heard as it starts and ends. Its report, or
 * the refusal, is kept once it ends, and `made` names the recording it made so the page can open it.
 */
export type Running = {
  game: string;
  from: "page" | "game";
  /** When it began, in seconds since 1970. */
  at: number;
  progress: ProgressState;
  /** False while it records; true once it has ended, made or refused. */
  ended: boolean;
  made: string | null;
  refusal: string | null;
};

export const recording = $state<{ running: Running | null }>({
  running: null,
});

/** Whether a recording from this window is running now, for any game. */
export function busy(): boolean {
  return recording.running !== null && !recording.running.ended;
}

/** Records a game from the page, on the owner's yes, and follows it to its end. */
export async function beginRecording(
  game: string,
  choice: RecordChoice,
  label: string,
): Promise<ReportReading> {
  recording.running = {
    game,
    from: "page",
    at: Date.now() / 1000,
    progress: started(label),
    ended: false,
    made: null,
    refusal: null,
  };
  const answer = await recordGame(game, choice, (message) => {
    if (recording.running?.game === game && !recording.running.ended)
      recording.running.progress = heard(recording.running.progress, message);
  });
  if (recording.running?.game === game) {
    const data = answer.state === "ready" ? answer.reading.data : null;
    recording.running.ended = true;
    recording.running.made =
      typeof data?.recording === "string" ? data.recording : null;
    recording.running.refusal =
      answer.state === "failed"
        ? answer.failure.detail
        : typeof data?.refusal === "string"
          ? data.refusal
          : null;
  }
  return answer;
}

/** A press of the key in the game, as the host tells it: the start of a recording, or its end. */
export function heardFromGame(
  game: string,
  label: string,
  press: GameRecorded,
) {
  if (!press.ended) {
    recording.running = {
      game,
      from: "game",
      at: press.at,
      progress: started(label),
      ended: false,
      made: null,
      refusal: null,
    };
    return;
  }
  const running = recording.running;
  if (running && running.from === "game" && running.at === press.at) {
    running.ended = true;
    running.made = press.recording;
    running.refusal = press.ok ? null : press.refusal;
  } else {
    // Refused at once (one was already running): say so without losing the one that runs.
    recording.running =
      running && !running.ended
        ? running
        : {
            game,
            from: "game",
            at: press.at,
            progress: started(label),
            ended: true,
            made: null,
            refusal: press.refusal,
          };
  }
}
