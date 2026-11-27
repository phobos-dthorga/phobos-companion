import { readReadingAhead } from "./desktopClient";

/**
 * Whether the window reads the slow pages ahead (0.116.0; the owner's choice of 28 Nov 2026, "Yes, one at a time"; Settings →
 * Games, on by default): read once a run, and changed by the Settings panel. The host keeps the choice and refuses a reading ahead
 * while it is off; this copy only saves the window from asking.
 */
export const readingAhead = $state<{ on: boolean; known: boolean }>({
  on: false,
  known: false,
});

let asked: Promise<boolean> | null = null;

/** The setting, asked of the host the first time. */
export function aheadOn(): Promise<boolean> {
  asked ??= readReadingAhead().then((on) => {
    readingAhead.on = on;
    readingAhead.known = true;
    return on;
  });
  return asked;
}

/** The setting as the host just kept it. */
export function aheadChosen(on: boolean): void {
  readingAhead.on = on;
  readingAhead.known = true;
  asked = Promise.resolve(on);
}
