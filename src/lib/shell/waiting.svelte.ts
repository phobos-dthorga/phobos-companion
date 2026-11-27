import { readAbout } from "../about/desktopClient";
import { standing } from "../about/presentation";
import { agents } from "../agents/state.svelte";
import { readDecisions } from "../decisions/desktopClient";
import { pageServes } from "../home/kinds";
import type { GameHome } from "../home/types";
import {
  keptModList,
  readModList,
  sortModList,
} from "../modlist/desktopClient";
import { keep as keepModList } from "../modlist/latest.svelte";
import { breakage, worthMentioning } from "../modlist/presentation";
import {
  keptInstalls,
  keptLedger,
  keptTextures,
  readInstalls,
  readLedger,
  readTextures,
} from "../mods/desktopClient";
import type { InstallsReading, TexturesReading } from "../mods/types";
import { split } from "../mods/ledger";
import { preflight } from "../mods/presentation";
import { readPatches, readSince } from "../mods/sinceReading";
import type { PageName } from "../navigation/place";
import { scanWatched } from "../reports/watched.svelte";
import { readPicks } from "../picks/desktopClient";
import { keptTestLists, readTestLists } from "../tests/desktopClient";
import type { TestsReading } from "../tests/types";
import { shelfCount } from "../tests/presentation";
import { aheadOn } from "./ahead.svelte";
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
 * - Reports (0.101.0): what the reports that count what waits on you found, such as the save checks on the newest save.
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
  void scanSlow(game, keep);
  void scanWatched(game.id).then((total) => keep("reports", "waiting", total));
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
 * The slow parts of the scan (0.116.0; the owner's choices of 28 Nov 2026: "Old at once, then fresh" and reading ahead, "Yes, one
 * at a time"). Each number shows at once from the answer its page last kept. With reading ahead on, each slow reading then runs
 * ahead, which the host queues one at a time behind anything the person asks, and keeps its answer, so the page opens at once
 * too; a fresh answer that fails leaves the kept number standing. With it off, nothing slow runs by itself: the numbers are the
 * kept ones, as fresh as each page's last reading.
 */
async function scanSlow(game: GameHome, keep: Keep) {
  const ahead = await aheadOn();
  const parts: Promise<void>[] = [scanTests(game.id, ahead, keep)];
  if (pageServes(game.kind, "mods")) {
    parts.push(scanSettings(game.id, ahead, keep));
    parts.push(scanMods(game, ahead, keep));
  }
  if (pageServes(game.kind, "modlist"))
    parts.push(scanModList(game.id, ahead, keep));
  await Promise.all(parts);
}

/** A number from the kept answer at once, then from a fresh one read ahead; a failed fresh one never hides a kept number. */
async function keptThenAhead<R>(
  kept: Promise<{ reading: R } | null>,
  fresh: (() => Promise<R>) | null,
  count: (reading: R) => number | null,
  put: (count: number | null) => void,
): Promise<R | null> {
  const before = await kept;
  if (before) put(count(before.reading));
  if (!fresh) {
    if (!before) put(null);
    return before?.reading ?? null;
  }
  const after = await fresh();
  const counted = count(after);
  if (counted !== null || !before) put(counted);
  return counted !== null ? after : (before?.reading ?? after);
}

async function scanTests(game: string, ahead: boolean, keep: Keep) {
  await keptThenAhead<TestsReading>(
    keptTestLists(game),
    ahead ? () => readTestLists(game, true) : null,
    (answer) =>
      answer.state === "ready" ? shelfCount(answer.lists, "seen") : null,
    (count) => keep("tests", "seen", count),
  );
}

async function scanSettings(game: string, ahead: boolean, keep: Keep) {
  type Ledgers = Awaited<ReturnType<typeof readLedger>>;
  await keptThenAhead<Ledgers>(
    keptLedger(game),
    ahead ? () => readLedger(game, undefined, true) : null,
    (answer) =>
      answer.state === "ready" && answer.ledgers.length > 0
        ? split(answer.ledgers).toLook.length
        : null,
    (count) => keep("mods", "settings", count),
  );
}

/**
 * The mod list: what the check found, and what a sort would move. The check is kept for Home's note and the Mod list page too.
 * The same check says what the first game run after the last change showed, which is the Logs page's number.
 */
async function scanModList(game: string, ahead: boolean, keep: Keep) {
  type Checked = Awaited<ReturnType<typeof readModList>>;
  const counts = (answer: Checked) =>
    answer.state === "ready" && answer.check.supported
      ? worthMentioning(answer.check)
      : null;
  const answer = await keptThenAhead<Checked>(
    keptModList(game, false),
    ahead ? () => readModList(game, false, undefined, true) : null,
    counts,
    (count) => keep("modlist", "faults", count),
  );
  if (!answer || answer.state !== "ready" || !answer.check.supported) {
    keep("logs", "new-errors", null);
    keep("modlist", "moves", null);
    return;
  }
  keepModList(game, answer.check);
  keep("logs", "new-errors", breakage(answer.check));
  const list = answer.check.lists[0]?.key;
  // A sort is only asked ahead: with reading ahead off, its number waits for the Mod list page.
  if (!list || !ahead) return keep("modlist", "moves", null);
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
async function scanMods(game: GameHome, ahead: boolean, keep: Keep) {
  const installs = await keptThenAhead<InstallsReading>(
    keptInstalls(game.id),
    ahead ? () => readInstalls(game.id, undefined, true) : null,
    (answer) =>
      answer.state === "ready" && answer.repositories.length > 0 ? 0 : null,
    () => {},
  );
  if (
    !installs ||
    installs.state !== "ready" ||
    installs.repositories.length === 0
  ) {
    keep("mods", "todo", null);
    keep("mods", "patched", null);
    return;
  }
  const repositories = installs.repositories;
  const running = repositories.some((r) => r.status.gameRunning.length > 0);
  const todo = (textures: TexturesReading) =>
    preflight(repositories, textures, game.name).filter(
      (check) => check.kind === "todo",
    ).length;
  void keptThenAhead<TexturesReading>(
    keptTextures(game.id),
    ahead ? () => readTextures(game.id, undefined, true) : null,
    (textures) => (textures.state === "failed" ? null : todo(textures)),
    (count) => keep("mods", "todo", count),
  );
  // What updated since you last played, and whether it touched a method ours patch: only ever read ahead.
  if (!ahead) return keep("mods", "patched", null);
  const since = await readSince(game.id, running, true);
  if (!since) return keep("mods", "patched", null);
  const patches = await readPatches(
    game.id,
    repositories.map((r) => r.repository),
    since,
    true,
  );
  keep(
    "mods",
    "patched",
    patches.state === "ready" ? patches.patched.length : null,
  );
}
