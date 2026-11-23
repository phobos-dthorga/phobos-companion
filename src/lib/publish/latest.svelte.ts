import { readWaiting } from "./desktopClient";

/**
 * How many Workshop items wait for an upload, for Home's note (0.69.0): `pending` runs the kit once per repository with a
 * catalogue, so Home reads it at most every half hour for a game, as it does its other notes.
 */
const FRESH_MS = 30 * 60 * 1000;

export const latest = $state<{
  game: string | null;
  waiting: number;
  at: number;
}>({
  game: null,
  waiting: 0,
  at: 0,
});

/** Reads again when the game changed or the latest is older than half an hour; quiet, for Home. */
export async function refreshIfStale(game: string): Promise<void> {
  if (latest.game === game && Date.now() - latest.at < FRESH_MS) return;
  latest.game = game;
  latest.at = Date.now();
  latest.waiting = 0;
  const answer = await readWaiting(game);
  if (answer.state === "ready" && latest.game === game)
    latest.waiting = answer.value.waiting;
}
