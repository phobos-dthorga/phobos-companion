/** One progress line from a working tool, as the host passes it on (phobos-modkit's progress lines). */
export type ProgressMessage = {
  label?: string | null;
  step?: number | null;
  of?: number | null;
  detail?: string | null;
};

/**
 * What a progress bar shows: what is being done, how far along when the work can be counted, its latest line of output, and the
 * stages already finished (0.21.0), oldest first, so the bar can show a trail of what is done and what is underway.
 */
export type ProgressState = {
  label: string;
  step: number | null;
  of: number | null;
  detail: string;
  done: string[];
};

/** Hears progress as it comes. */
export type OnProgress = (message: ProgressMessage) => void;

/** How many finished stages a state keeps: the trail shows the last few and counts the rest. */
const DONE_KEPT = 24;

/** Work that has started and said nothing yet: the bar moves, with the words its caller gives it. */
export function started(label = ""): ProgressState {
  return { label, step: null, of: null, detail: "", done: [] };
}

/**
 * The state after one more message. A new label starts a new stage, so the last one's count and detail go unless the message
 * brings its own, and the last label joins the finished stages; a message with only a detail keeps the label and the count. A new
 * label that carries on the same count (step 3 of 8 after step 2 of 8: "Comparing Medical" after "Comparing Framework") is the same
 * stage moving on, so the trail does not fill with every item.
 */
export function heard(
  state: ProgressState,
  message: ProgressMessage,
): ProgressState {
  const counted =
    typeof message.step === "number" &&
    typeof message.of === "number" &&
    message.of > 0;
  if (message.label) {
    const sameStage =
      counted &&
      state.of === message.of &&
      state.step !== null &&
      message.step! >= state.step;
    const finished =
      !sameStage && state.label && state.label !== message.label
        ? [...state.done, state.label].slice(-DONE_KEPT)
        : state.done;
    return {
      label: message.label,
      step: counted ? Math.min(message.step!, message.of!) : null,
      of: counted ? message.of! : null,
      detail: message.detail ?? "",
      done: finished,
    };
  }
  return {
    label: state.label,
    step: counted ? Math.min(message.step!, message.of!) : state.step,
    of: counted ? message.of! : state.of,
    detail: message.detail ?? state.detail,
    done: state.done,
  };
}

/**
 * How full the bar is, from 0 to 1, or null when the work cannot be counted. A step being worked on is not yet done, so step 3
 * of 23 shows two done; the last step shows nearly full until the answer arrives.
 */
export function fraction(state: ProgressState): number | null {
  if (state.step === null || state.of === null || state.of <= 0) return null;
  return Math.max(0, Math.min(1, (state.step - 1) / state.of));
}

/** The finished stages a trail shows (the last few), and how many earlier ones it leaves out. */
export function trail(
  state: ProgressState,
  shown = 4,
): { stages: string[]; earlier: number } {
  const stages = state.done.slice(-shown);
  return { stages, earlier: state.done.length - stages.length };
}
