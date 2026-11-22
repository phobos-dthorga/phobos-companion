import { readAbout } from "../about/desktopClient";
import { standing } from "../about/presentation";
import { agents } from "../agents/state.svelte";
import { readDecisions } from "../decisions/desktopClient";
import { pageServes } from "../home/kinds";
import type { GameHome } from "../home/types";
import { readModList, sortModList } from "../modlist/desktopClient";
import { keep as keepModList } from "../modlist/latest.svelte";
import { breakage, worthMentioning } from "../modlist/presentation";
import { readInstalls, readLedger, readTextures } from "../mods/desktopClient";
import { split } from "../mods/ledger";
import { preflight } from "../mods/presentation";
import { readPatches, readSince } from "../mods/sinceReading";
import type { PageName } from "../navigation/place";
import { readPicks } from "../picks/desktopClient";
import { readTestLists } from "../tests/desktopClient";
import { shelfCount } from "../tests/presentation";
import { counted, withPart, type Parts } from "./waiting";

/**
 * What waits on the owner, by page, for the page list's numbers (0.66.0; the owner's choice of 23 Nov 2026: "only what waits on
 * you"). Each is a reading a page already makes, asked quietly in the background (0.67.0: "a scan after updating to see if a sort
 * is needed", and every other scan the owner chose by card):
 *
 * - Decisions and Picks: those waiting for an answer, while features for agent sessions show.
 * - Tests: rows the game saw working that nobody has judged.
 * - Mod list: the check's problems and warnings, plus the mods a sort would move.
 * - Logs: new errors the game's first run showed after the last change to the mod list.
 * - Mods: settings to look at, things Before you play lists as to do, and updates that changed a method our mods patch.
 * - About: a mark, not a number, when a newer version of the program waits.
 *
 * A page with nothing waiting, or whose reading failed, has no number: a number never stands for "unknown". The scans only read.
 */
export const waiting = $state<{
  game: string | null;
  counts: Partial<Record<PageName, number>>;
  /** Pages marked without a number, each with the words for why, as a message key. */
  marks: Partial<Record<PageName, string>>;
  /** When the scan was last started, in milliseconds; 0 before the first. */
  at: number;
}>({ game: null, counts: {}, marks: {}, at: 0 });

let asked = 0;
/** Every part's last answer for the game shown: a new scan replaces each as it arrives, so a number never blinks out meanwhile. */
let parts: Parts = {};

/** Reads every count for a game, each read on its own so a slow one never holds the others back. */
export function readWaiting(game: GameHome) {
  const ask = ++asked;
  // Another game starts from nothing; the same game keeps its numbers on screen until each new answer arrives.
  if (waiting.game !== game.id) {
    parts = {};
    waiting.counts = {};
    waiting.marks = {};
  }
  waiting.game = game.id;
  waiting.at = Date.now();
  const keep = (page: PageName, part: string, count: number | null) => {
    if (ask !== asked) return;
    parts = withPart(parts, page, part, count);
    waiting.counts = counted(parts);
  };

  if (!agents.shown) {
    keep("decisions", "waiting", null);
    keep("picks", "waiting", null);
  } else {
    void readDecisions().then((answer) =>
      keep(
        "decisions",
        "waiting",
        answer.state === "ready" ? answer.list.waiting : null,
      ),
    );
    void readPicks().then((answer) =>
      keep(
        "picks",
        "waiting",
        answer.state === "ready" ? answer.list.waiting : null,
      ),
    );
  }
  void readTestLists(game.id).then((answer) =>
    keep(
      "tests",
      "seen",
      answer.state === "ready" ? shelfCount(answer.lists, "seen") : null,
    ),
  );
  if (pageServes(game.kind, "mods")) {
    void readLedger(game.id).then((answer) =>
      keep(
        "mods",
        "settings",
        answer.state === "ready" && answer.ledgers.length > 0
          ? split(answer.ledgers).toLook.length
          : null,
      ),
    );
    void scanMods(game, keep);
  }
  if (pageServes(game.kind, "modlist")) void scanModList(game.id, keep);
  void readAbout().then((answer) => {
    if (ask !== asked) return;
    const { about: _, ...others } = waiting.marks;
    waiting.marks =
      answer.state === "ready" && standing(answer.about).kind === "newer"
        ? { ...others, about: "pages-mark-newer" }
        : others;
  });
}

type Keep = (page: PageName, part: string, count: number | null) => void;

/**
 * The mod list: what the check found, and what a sort would move. The check is kept for Home's note and the Mod list page too.
 * The same check says what the first game run after the last change showed, which is the Logs page's number.
 */
async function scanModList(game: string, keep: Keep) {
  const answer = await readModList(game, false);
  if (answer.state !== "ready" || !answer.check.supported) {
    keep("modlist", "faults", null);
    keep("logs", "new-errors", null);
    return;
  }
  keepModList(game, answer.check);
  keep("modlist", "faults", worthMentioning(answer.check));
  keep("logs", "new-errors", breakage(answer.check));
  const list = answer.check.lists[0]?.key;
  if (!list) return keep("modlist", "moves", null);
  const sorted = await sortModList(game, list, false, false);
  keep(
    "modlist",
    "moves",
    sorted.state === "ready" && sorted.result.ok
      ? (sorted.result.data.moves?.length ?? null)
      : null,
  );
}

/**
 * The Mods page: what Before you play lists as to do (a build, changes not installed, textures to encode), and the updates since
 * you last played that changed a method our mods patch.
 */
async function scanMods(game: GameHome, keep: Keep) {
  const installs = await readInstalls(game.id);
  if (installs.state !== "ready" || installs.repositories.length === 0) {
    keep("mods", "todo", null);
    keep("mods", "patched", null);
    return;
  }
  const repositories = installs.repositories;
  const running = repositories.some((r) => r.status.gameRunning.length > 0);
  void readTextures(game.id).then((textures) =>
    keep(
      "mods",
      "todo",
      preflight(repositories, textures, game.name).filter(
        (check) => check.kind === "todo",
      ).length,
    ),
  );
  const since = await readSince(game.id, running);
  if (!since) return keep("mods", "patched", null);
  const patches = await readPatches(
    game.id,
    repositories.map((r) => r.repository),
    since,
  );
  keep(
    "mods",
    "patched",
    patches.state === "ready" ? patches.patched.length : null,
  );
}
