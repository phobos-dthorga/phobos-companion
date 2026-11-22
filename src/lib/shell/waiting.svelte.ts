import { agents } from "../agents/state.svelte";
import { readDecisions } from "../decisions/desktopClient";
import { pageServes } from "../home/kinds";
import type { GameHome } from "../home/types";
import { split } from "../mods/ledger";
import { readLedger } from "../mods/desktopClient";
import type { PageName } from "../navigation/place";
import { readPicks } from "../picks/desktopClient";
import { readTestLists } from "../tests/desktopClient";
import { shelfCount } from "../tests/presentation";
import { counted } from "./waiting";

/**
 * What waits on the owner, by page, for the page list's counts (0.66.0; the owner's choice of 23 Nov 2026: "only what waits on
 * you"): decisions and picks to answer, test rows the game saw working that nobody has judged, and mod settings to look at. A page
 * with nothing waiting, or whose count could not be read, has none: a count never stands for "unknown".
 */
export const waiting = $state<{
  game: string | null;
  counts: Partial<Record<PageName, number>>;
}>({ game: null, counts: {} });

let asked = 0;

/** Reads every count for a game, each read on its own so a slow one never holds the others back. */
export function readWaiting(game: GameHome) {
  const ask = ++asked;
  const found: Partial<Record<PageName, number | null>> = {};
  waiting.game = game.id;
  waiting.counts = {};
  const keep = (page: PageName, count: number | null) => {
    if (ask !== asked) return;
    found[page] = count;
    waiting.counts = counted(found);
  };
  if (agents.shown) {
    void readDecisions().then((answer) =>
      keep("decisions", answer.state === "ready" ? answer.list.waiting : null),
    );
    void readPicks().then((answer) =>
      keep("picks", answer.state === "ready" ? answer.list.waiting : null),
    );
  }
  void readTestLists(game.id).then((answer) =>
    keep(
      "tests",
      answer.state === "ready" ? shelfCount(answer.lists, "seen") : null,
    ),
  );
  if (pageServes(game.kind, "mods"))
    void readLedger(game.id).then((answer) =>
      keep(
        "mods",
        answer.state === "ready" && answer.ledgers.length > 0
          ? split(answer.ledgers).toLook.length
          : null,
      ),
    );
}
