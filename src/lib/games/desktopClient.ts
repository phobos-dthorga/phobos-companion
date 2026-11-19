import { ask, progressChannel } from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { Added, NewGame, SteamGames } from "./types";

/** Every game Steam has installed, with guesses at each one's data folder and whether the list holds it (0.31.0). */
export async function readSteamGames(
  onProgress?: OnProgress,
): Promise<{ state: "ready"; steam: SteamGames } | Failed> {
  return ask<SteamGames, { state: "ready"; steam: SteamGames }>(
    "steam_games",
    { onProgress: progressChannel(onProgress) },
    (steam) => ({ state: "ready", steam }),
  );
}

/** Adds a game to the owner's list. The host checks everything again and keeps the list as it was beside it. */
export async function addGame(
  game: NewGame,
): Promise<{ state: "done"; added: Added } | Failed> {
  return ask<Added, { state: "done"; added: Added }>(
    "add_game",
    { game },
    (added) => ({ state: "done", added }),
  );
}
