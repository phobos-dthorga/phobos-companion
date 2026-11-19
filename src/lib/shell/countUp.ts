/** How long a figure takes to count up to its value (0.21.0). */
export const COUNT_UP_MS = 700;

/** The value part way through counting up: eased, so it slows as it arrives. */
export function countedAt(
  from: number,
  to: number,
  elapsedMs: number,
  ms = COUNT_UP_MS,
): number {
  if (elapsedMs >= ms) return to;
  const t = Math.max(0, elapsedMs / ms);
  const eased = 1 - (1 - t) ** 3;
  return Math.round(from + (to - from) * eased);
}

/**
 * Counts a figure up from where it is to a new value, frame by frame, calling `show` with each; at once when motion is reduced.
 * Returns a function that stops it.
 */
export function countUp(
  from: number,
  to: number,
  show: (value: number) => void,
): () => void {
  const reduced =
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true;
  if (reduced || from === to || typeof requestAnimationFrame === "undefined") {
    show(to);
    return () => {};
  }
  const begun = performance.now();
  let frame = 0;
  const step = (now: number) => {
    const value = countedAt(from, to, now - begun);
    show(value);
    if (value !== to) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}
