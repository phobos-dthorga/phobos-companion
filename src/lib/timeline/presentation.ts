import { dayOf } from "../shell/dates";
export { dayOf, dayWords, shortDay, timeWords } from "../shell/dates";
import type { Fact, FactKind, StoodEntry } from "./types";

/** How a kind of fact is shown: its mark, its colour's role, and how much it says about a day (the strongest shows in a lane). */
export type KindLook = {
  mark: string;
  tone: "observed" | "success" | "risk" | "comparison" | "accent";
  weight: number;
};

/** Every kind's mark. A mark always comes with words; its colour never carries the meaning alone. */
export const KIND_LOOKS: Record<FactKind, KindLook> = {
  "version-released": { mark: "★", tone: "success", weight: 100 },
  "product-ended": { mark: "⇢", tone: "risk", weight: 95 },
  installed: { mark: "◆", tone: "comparison", weight: 90 },
  "went-back": { mark: "⤺", tone: "comparison", weight: 88 },
  "version-written": { mark: "✚", tone: "accent", weight: 80 },
  "product-started": { mark: "●", tone: "accent", weight: 75 },
  "product-renamed": { mark: "↻", tone: "observed", weight: 70 },
  "version-removed": { mark: "✖", tone: "risk", weight: 65 },
  "entries-removed": { mark: "−", tone: "risk", weight: 50 },
  "entries-reworded": { mark: "✎", tone: "observed", weight: 40 },
  "entries-added": { mark: "+", tone: "observed", weight: 35 },
  "setting-added": { mark: "⚑", tone: "accent", weight: 58 },
  "setting-default": { mark: "⇄", tone: "observed", weight: 56 },
  "setting-removed": { mark: "⚐", tone: "risk", weight: 54 },
  "backed-up": { mark: "▣", tone: "comparison", weight: 30 },
  "duplicates-removed": { mark: "≡", tone: "comparison", weight: 25 },
  built: { mark: "⚙", tone: "comparison", weight: 20 },
  encoded: { mark: "▦", tone: "comparison", weight: 10 },
};

/** Which facts to show: everything, only what the repositories did, or only what was done on this PC. */
export type Showing = "all" | "git" | "log";

/** The lane a fact belongs to: its product, else its mod, else none (something done for the whole game, such as encoding). */
export function laneOf(fact: Fact): string | null {
  return fact.product || fact.mod || null;
}

export function showingFilter(showing: Showing): (fact: Fact) => boolean {
  return showing === "all" ? () => true : (fact) => fact.source === showing;
}

/** Facts grouped by day, newest day first, each day's facts newest first. */
export function byDay(facts: Fact[]): { day: string; facts: Fact[] }[] {
  const days = new Map<string, Fact[]>();
  for (const fact of [...facts].sort((a, b) =>
    a.time < b.time ? 1 : a.time > b.time ? -1 : 0,
  )) {
    const day = dayOf(fact.time);
    const list = days.get(day);
    if (list) list.push(fact);
    else days.set(day, [fact]);
  }
  return [...days.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, list]) => ({ day, facts: list }));
}

/** One lane's day: its facts and the strongest kind among them, the one its mark shows. */
export type LaneCell = { day: string; facts: Fact[]; strongest: FactKind };

export type Lane = {
  name: string;
  /** The product ended (merged into another, or its changelog removed) and nothing happened to it after. */
  ended: boolean;
  /** The product it merged into, when it ended that way (cross-links S3). */
  mergedInto: string | null;
  /** Its newest fact's time, which orders the lanes. */
  latest: string;
  cells: Map<string, LaneCell>;
};

/**
 * The overview: one lane a product, most recently active first, with a cell for each day something happened to it; and the days
 * anything happened, oldest first. Days when nothing happened are left out, so a long quiet spell takes no room.
 */
export function lanes(facts: Fact[]): { days: string[]; lanes: Lane[] } {
  const found = new Map<string, Lane>();
  const days = new Set<string>();
  for (const fact of [...facts].sort((a, b) =>
    a.time < b.time ? -1 : a.time > b.time ? 1 : 0,
  )) {
    const name = laneOf(fact);
    if (!name) continue;
    const day = dayOf(fact.time);
    days.add(day);
    let lane = found.get(name);
    if (!lane) {
      lane = {
        name,
        ended: false,
        mergedInto: null,
        latest: fact.time,
        cells: new Map(),
      };
      found.set(name, lane);
    }
    lane.latest = fact.time;
    lane.ended = fact.kind === "product-ended";
    lane.mergedInto = lane.ended ? (fact.mergedInto ?? null) : null;
    const cell = lane.cells.get(day);
    if (!cell)
      lane.cells.set(day, { day, facts: [fact], strongest: fact.kind });
    else {
      cell.facts.push(fact);
      if (KIND_LOOKS[fact.kind].weight > KIND_LOOKS[cell.strongest].weight)
        cell.strongest = fact.kind;
    }
  }
  return {
    days: [...days].sort(),
    lanes: [...found.values()].sort((a, b) =>
      a.latest < b.latest
        ? 1
        : a.latest > b.latest
          ? -1
          : a.name.localeCompare(b.name),
    ),
  };
}

/** Where a month begins among the overview's days, so its name is written once above them. */
export function monthStarts(days: string[]): Set<string> {
  const starts = new Set<string>();
  let last = "";
  for (const day of days) {
    if (day.slice(0, 7) !== last) starts.add(day);
    last = day.slice(0, 7);
  }
  return starts;
}

/** Whether a fact can be read as it stood: it names a changelog, and a commit or (for a fact from this PC) a moment. */
export function canReadAsItStood(fact: Fact): boolean {
  return Boolean(
    fact.changelog && fact.repository && (fact.commit || fact.source === "log"),
  );
}

/** Whether a fact is about a setting (kit 1.40.0). */
export function isSetting(fact: Fact): boolean {
  return fact.kind.startsWith("setting-");
}

/** Whether a fact has code to show: it came from git, with its commit, and names a changelog or is about a setting. */
export function canShowCode(fact: Fact): boolean {
  return (
    fact.source === "git" &&
    Boolean(fact.commit && fact.repository) &&
    (Boolean(fact.changelog) || isSetting(fact))
  );
}

/** How many of a fact's entries are not listed (the kit lists up to eight). */
export function unlisted(fact: Fact): number {
  return Math.max((fact.count ?? 0) - (fact.entries?.length ?? 0), 0);
}

/** The entries of a version as it stood, keeping only what changed since when asked. */
export function stoodEntries(
  entries: StoodEntry[],
  changedOnly: boolean,
): StoodEntry[] {
  return changedOnly
    ? entries.filter((entry) => entry.since !== "kept")
    : entries;
}

/** Kinds done to several mods at once from this PC, shown as one row when they happen together. */
const BATCHED: FactKind[] = ["installed", "backed-up", "went-back"];

/** One row of a day: a fact on its own, or several of one kind done together on this PC (one install of many mods). */
export type Row =
  | { kind: "single"; fact: Fact }
  | { kind: "batch"; factKind: FactKind; time: string; facts: Fact[] }
  | { kind: "settings"; commit: string; facts: Fact[] };

/**
 * A day's facts as rows: facts from this PC of one batched kind, in the same repository and the same minute, next to each other,
 * become one row; everything else stays a row of its own. Order is kept.
 */
export function rows(facts: Fact[]): Row[] {
  const found: Row[] = [];
  const together = (a: Fact, b: Fact) =>
    a.source === "log" &&
    b.source === "log" &&
    a.kind === b.kind &&
    BATCHED.includes(a.kind) &&
    a.repository === b.repository &&
    a.time.slice(0, 16) === b.time.slice(0, 16);
  for (const fact of facts) {
    const last = found[found.length - 1];
    // One commit's settings changes are one row: a commit can add dozens.
    if (isSetting(fact) && fact.commit) {
      if (last?.kind === "settings" && last.commit === fact.commit)
        last.facts.push(fact);
      else found.push({ kind: "settings", commit: fact.commit, facts: [fact] });
      continue;
    }
    if (last?.kind === "batch" && together(last.facts[0], fact)) {
      last.facts.push(fact);
    } else if (last?.kind === "single" && together(last.fact, fact)) {
      found[found.length - 1] = {
        kind: "batch",
        factKind: fact.kind,
        time: last.fact.time,
        facts: [last.fact, fact],
      };
    } else {
      found.push({ kind: "single", fact });
    }
  }
  return found;
}

/** One mod as it was installed at a moment: its last install or go-back up to then. */
export type Running = { name: string; version: string; fact: Fact };

/**
 * What was installed at the end of a day (docs/cross-links.md, L4): for each mod, the version its last install or go-back up to and
 * including that day put in place, from this PC's history log. A mod installed only before the log began, or never through the
 * tools, is not known and not listed.
 */
export function runningOn(facts: Fact[], day: string): Running[] {
  const latest = new Map<string, Fact>();
  for (const fact of facts) {
    if (
      fact.source !== "log" ||
      (fact.kind !== "installed" && fact.kind !== "went-back") ||
      !fact.version
    )
      continue;
    if (dayOf(fact.time) > day) continue;
    const key = `${fact.repository ?? ""}/${fact.mod ?? fact.product ?? ""}`;
    const known = latest.get(key);
    if (!known || known.time < fact.time) latest.set(key, fact);
  }
  return [...latest.values()]
    .map((fact) => ({
      name: fact.product ?? fact.mod ?? "",
      version: fact.version!,
      fact,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The lanes that merged into a product: where it took them in (cross-links S3). */
export function mergedFrom(all: Lane[], name: string): string[] {
  return all.filter((lane) => lane.mergedInto === name).map((l) => l.name);
}

/**
 * The day list with the days screenshots were taken added (0.32.0): a day with screenshots and nothing else still gets its place,
 * so the pictures sit on their day. Newest first, as `byDay` gives them.
 */
export function withShotDays(
  groups: { day: string; facts: Fact[] }[],
  shotDays: string[],
): { day: string; facts: Fact[] }[] {
  const known = new Set(groups.map((group) => group.day));
  const added = shotDays
    .filter((day) => !known.has(day))
    .map((day) => ({ day, facts: [] as Fact[] }));
  return [...groups, ...added].sort((a, b) => (a.day < b.day ? 1 : -1));
}
