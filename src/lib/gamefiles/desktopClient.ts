import { ask } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { GameFiles } from "./types";

/** What the game writes and what Steam records, since a moment (null: since the last launch). */
export async function readGameFiles(
  game: string,
  since: string | null,
): Promise<{ state: "ready"; files: GameFiles } | Failed> {
  return ask<GameFiles, { state: "ready"; files: GameFiles }>(
    "game_files",
    { game, since },
    (files) => ({ state: "ready", files }),
  );
}

/** Shows a save or a screenshot the page listed in the file manager. */
export async function showGameFile(
  path: string,
): Promise<{ state: "ready" } | Failed> {
  return ask<null, { state: "ready" }>("show_game_file", { path }, () => ({
    state: "ready",
  }));
}
