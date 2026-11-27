import { keepLaunchLine, readLaunchLine } from "./desktopClient";

/**
 * Each game's arguments line (0.117.0; the owner's cards of 28 Nov 2026: "Always the game's program", one line per game, kept from
 * Settings → Games and from the Mod list): the words the game's own program is started with, such as -harmony-detours. Read from
 * the kit's `mod-list launch` once per run and shared, so every place that shows it agrees. `none` is a game the kit cannot start.
 */
export type Launch =
  | { state: "reading" }
  | { state: "none"; reason: string }
  | { state: "ready"; line: string; program: string | null };

export const launches = $state<Record<string, Launch>>({});

/** Reads a game's line, once per run unless `again`. */
export async function loadLaunch(game: string, again = false): Promise<void> {
  if (!again && launches[game]) return;
  launches[game] = { state: "reading" };
  const answer = await readLaunchLine(game);
  if (answer.state === "failed") {
    launches[game] = { state: "none", reason: answer.failure.detail };
  } else if (!answer.result.ok) {
    launches[game] = { state: "none", reason: answer.result.refusal ?? "" };
  } else {
    launches[game] = {
      state: "ready",
      line: answer.result.data.arguments ?? "",
      program: answer.result.data.program ?? null,
    };
  }
}

/** Keeps a new line for a game (an empty one keeps none); returns why it was refused, or null once kept. */
export async function keepLaunch(
  game: string,
  line: string,
): Promise<string | null> {
  const answer = await keepLaunchLine(game, line);
  if (answer.state === "failed") return answer.failure.detail;
  if (!answer.result.ok) return answer.result.refusal ?? "";
  const known = launches[game];
  launches[game] = {
    state: "ready",
    line: answer.result.data.arguments ?? line.trim(),
    program:
      answer.result.data.program ??
      (known?.state === "ready" ? known.program : null),
  };
  return null;
}
