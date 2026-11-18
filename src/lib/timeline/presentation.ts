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
  "backed-up": { mark: "▣", tone: "comparison", weight: 30 },
  built: { mark: "⚙", tone: "comparison", weight: 20 },
  encoded: { mark: "▦", tone: "comparison", weight: 10 },
};

/** Which facts to show: everything, only what the repositories did, or only what was done on this PC. */
export type Showing = "all" | "git" | "log";

/** The lane a fact belongs to: its product, else its mod, else none (something done for the whole game, such as encoding). */
export function laneOf(fact: Fact): string | null {
  return fact.product || fact.mod || null;
}

/** A fact's day in the viewer's own time zone, as YYYY-MM-DD. */
export function dayOf(time: string): string {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return time.slice(0, 10);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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
      lane = { name, ended: false, latest: fact.time, cells: new Map() };
      found.set(name, lane);
    }
    lane.latest = fact.time;
    lane.ended = fact.kind === "product-ended";
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

/** Whether a fact has code to show: it came from git, with its commit and changelog. */
export function canShowCode(fact: Fact): boolean {
  return (
    fact.source === "git" &&
    Boolean(fact.commit && fact.changelog && fact.repository)
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

/** A day, written for people: "Tue 18 Nov 2026". */
export function dayWords(day: string, locale = "en-AU"): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, date));
}

/** A day's short label in the overview: its date number, with its month's name above where the month begins. */
export function shortDay(
  day: string,
  locale = "en-AU",
): { date: string; month: string } {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return { date: day, month: "" };
  const at = new Date(year, month - 1, date);
  return {
    date: String(date),
    month: new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "2-digit",
    }).format(at),
  };
}

/** A fact's time of day, in the viewer's time zone. */
export function timeWords(time: string, locale = "en-AU"): string {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Kinds done to several mods at once from this PC, shown as one row when they happen together. */
const BATCHED: FactKind[] = ["installed", "backed-up", "went-back"];

/** One row of a day: a fact on its own, or several of one kind done together on this PC (one install of many mods). */
export type Row =
  | { kind: "single"; fact: Fact }
  | { kind: "batch"; factKind: FactKind; time: string; facts: Fact[] };

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

/** A fact's entries under their sections, in the order the sections first appear. */
export function entrySections<T extends { section: string }>(
  entries: T[],
): { section: string; entries: T[] }[] {
  const sections: { section: string; entries: T[] }[] = [];
  for (const entry of entries) {
    let found = sections.find((s) => s.section === entry.section);
    if (!found) {
      found = { section: entry.section, entries: [] };
      sections.push(found);
    }
    found.entries.push(entry);
  }
  return sections;
}
