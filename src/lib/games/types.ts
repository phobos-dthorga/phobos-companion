/** One guess at a game's data folder, surest first (phobos-modkit 1.58.0, `game-files steam-games`). */
export type DataGuess = { path: string; score: number; reason: string };

/** A game Steam has installed, as the kit gives it, with the id it already has on the list (0.31.0). */
export type SteamGame = {
  appId: number;
  name: string;
  install: string;
  sizeOnDisk: number | null;
  lastPlayed: number | null;
  dataGuesses?: DataGuess[];
  listedAs: string | null;
};

export type SteamGames = {
  games: SteamGame[];
  /** Folders under the list's root holding a repository no game names. */
  repositories: string[];
  list_file: string;
  list_exists: boolean;
};

/** What the window asks the host to add; the host checks it all again. */
export type NewGame = {
  id: string;
  name: string;
  steam_app_id: number | null;
  data: string | null;
  repositories: string[];
};

export type Added = { id: string; list_file: string; before: string };
