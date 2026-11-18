/** One progress line from a working tool, as the host passes it on (phobos-modkit's progress lines). */
export type ProgressMessage = {
  label?: string | null;
  step?: number | null;
  of?: number | null;
  detail?: string | null;
};

/** What a progress bar shows: what is being done, how far along when the work can be counted, and its latest line of output. */
export type ProgressState = {
  label: string;
  step: number | null;
  of: number | null;
  detail: string;
};

/** Hears progress as it comes. */
export type OnProgress = (message: ProgressMessage) => void;

/** Work that has started and said nothing yet: the bar moves, with the words its caller gives it. */
export function started(label = ""): ProgressState {
  return { label, step: null, of: null, detail: "" };
}

/**
 * The state after one more message. A new label starts a new piece of work, so the last one's count and detail go unless the
 * message brings its own; a message with only a detail keeps the label and the count.
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
    return {
      label: message.label,
      step: counted ? Math.min(message.step!, message.of!) : null,
      of: counted ? message.of! : null,
      detail: message.detail ?? "",
    };
  }
  return {
    label: state.label,
    step: counted ? Math.min(message.step!, message.of!) : state.step,
    of: counted ? message.of! : state.of,
    detail: message.detail ?? state.detail,
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
