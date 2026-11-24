import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { Fetching, Setup, SetupReading } from "./types";

type Answer = { state: "ready"; setup: Setup } | Failed;
const ready = (setup: Setup) => ({ state: "ready" as const, setup });

/** How the setup stands (0.87.0). Only reads. */
export async function readSetup(): Promise<SetupReading> {
  if (inBrowser()) return BROWSER;
  return ask<Setup, Answer>("setup_status", {}, ready);
}

/** Looks again on the person's press: the host reads Windows' search path afresh first. */
export async function lookAgain(): Promise<Answer> {
  return ask<Setup, Answer>("setup_look_again", {}, ready);
}

/** The fetch running or just ended, if any. */
export async function readFetching(): Promise<
  { state: "ready"; fetching: Fetching | null } | Failed
> {
  return ask<
    Fetching | null,
    { state: "ready"; fetching: Fetching | null } | Failed
  >("setup_fetching", {}, (fetching) => ({ state: "ready", fetching }));
}

/** Runs the command that fetches a missing program, on the person's press. The window names the program; the host has the command. */
export async function fetchProgram(
  key: string,
): Promise<{ state: "ready"; fetching: Fetching } | Failed> {
  return ask<Fetching, { state: "ready"; fetching: Fetching } | Failed>(
    "setup_fetch",
    { key },
    (fetching) => ({ state: "ready", fetching }),
  );
}

/** Stops the fetch that is running. */
export async function stopFetch(): Promise<{ state: "ready" } | Failed> {
  return ask<null, { state: "ready" } | Failed>("setup_stop", {}, () => ({
    state: "ready",
  }));
}

/** Keeps the person's word that they do or don't need a program. */
export async function setAside(key: string, aside: boolean): Promise<Answer> {
  return ask<Setup, Answer>("setup_set_aside", { key, aside }, ready);
}

/** Writes the ticked starter files into one listed repository, after the person saw each whole (0.89.0). */
export async function writeStarters(
  game: string,
  repository: string,
  starters: string[],
): Promise<{ state: "ready"; setup: Setup; refused: string[] } | Failed> {
  return ask<
    { setup: Setup; refused: string[] },
    { state: "ready"; setup: Setup; refused: string[] } | Failed
  >("setup_write_starters", { game, repository, starters }, (answer) => ({
    state: "ready",
    setup: answer.setup,
    refused: answer.refused,
  }));
}

/** Opens the page a program is got from by hand, in the browser. */
export async function openPage(
  key: string,
): Promise<{ state: "ready" } | Failed> {
  return ask<null, { state: "ready" } | Failed>(
    "setup_open_page",
    { key },
    () => ({ state: "ready" }),
  );
}
