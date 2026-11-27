import type { ModRow, ModsListing } from "./types";

/**
 * A list being edited before Save (0.108.0; the owner's choice of 27 Nov 2026, "Hold until Save", with lessons from RimSort). Every
 * move and switch changes only this draft; Save writes it whole with the tools' `mod-list write`, which refuses when the list
 * changed since `was`. Mods are named by key throughout; ids are worked out only for Save. Pure: no window, no host.
 */
export type Draft = {
  listKey: string;
  /** The list's keys as read, in order: what Save checks the list still holds. */
  was: string[];
  /** The list being made, in order. */
  order: string[];
  /** Earlier orders, newest last, for Undo. */
  history: string[][];
};

/** What a row may be warned of, worked out from the draft as it stands. */
export type MarkKind = "needs" | "after" | "before" | "refuses" | "absent";
export type Mark = { kind: MarkKind; other: string };

const MOST_UNDO = 200;

export function begin(listing: ModsListing, listKey: string): Draft {
  const list = listing.lists.find((l) => l.key === listKey);
  const keys = (list?.entries ?? []).map((e) => e.key);
  return { listKey, was: keys, order: keys, history: [] };
}

function changed(draft: Draft, order: string[]): Draft {
  if (same(order, draft.order)) return draft;
  const history = [...draft.history, draft.order].slice(-MOST_UNDO);
  return { ...draft, order, history };
}

function same(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((k, n) => k === b[n]);
}

export function undo(draft: Draft): Draft {
  const last = draft.history.at(-1);
  return last
    ? { ...draft, order: last, history: draft.history.slice(0, -1) }
    : draft;
}

/** The draft back as it was read, as one step Undo can take back. */
export function throwAway(draft: Draft): Draft {
  return changed(draft, draft.was);
}

/** Switches mods on: just before the first mod on the list that needs one of them, else at the end, in the order given. */
export function switchOn(
  draft: Draft,
  keys: string[],
  mods: Map<string, ModRow>,
): Draft {
  const adding = keys.filter((k) => !draft.order.includes(k));
  if (adding.length === 0) return draft;
  const ids = new Set(adding.flatMap((k) => idsFor(k, mods)));
  const needer = draft.order.findIndex((k) =>
    (mods.get(k)?.need_ids ?? []).some((any) =>
      any.some((id) => ids.has(id.toLowerCase())),
    ),
  );
  const at = needer < 0 ? draft.order.length : needer;
  return changed(draft, [
    ...draft.order.slice(0, at),
    ...adding,
    ...draft.order.slice(at),
  ]);
}

function idsFor(key: string, mods: Map<string, ModRow>): string[] {
  const mod = mods.get(key);
  return [key, mod?.id ?? ""].filter(Boolean).map((i) => i.toLowerCase());
}

export function switchOff(draft: Draft, keys: string[]): Draft {
  const gone = new Set(keys);
  return changed(
    draft,
    draft.order.filter((k) => !gone.has(k)),
  );
}

/** The chosen mods taken out and put back as one block, in list order, at `place` (1 is first, counted without them). */
export function placeBlock(draft: Draft, keys: string[], place: number): Draft {
  const chosen = new Set(keys);
  const block = draft.order.filter((k) => chosen.has(k));
  if (block.length === 0) return draft;
  const rest = draft.order.filter((k) => !chosen.has(k));
  const at = Math.max(0, Math.min(place - 1, rest.length));
  return changed(draft, [...rest.slice(0, at), ...block, ...rest.slice(at)]);
}

/** Where the chosen block starts now, counted without it (1 is first). */
export function blockStart(draft: Draft, keys: string[]): number {
  const chosen = new Set(keys);
  const first = draft.order.findIndex((k) => chosen.has(k));
  if (first < 0) return 1;
  return draft.order.slice(0, first).filter((k) => !chosen.has(k)).length + 1;
}

/** The chosen block moved by a step (up is negative), or to either end with ±Infinity. */
export function moveBy(draft: Draft, keys: string[], step: number): Draft {
  const others =
    draft.order.length - keys.filter((k) => draft.order.includes(k)).length;
  const to = Math.max(1, Math.min(blockStart(draft, keys) + step, others + 1));
  return placeBlock(draft, keys, to);
}

/** The chosen block put just before or after another mod on the list (a drop); unchanged when the target is in the block. */
export function placeBeside(
  draft: Draft,
  keys: string[],
  target: string,
  after: boolean,
): Draft {
  if (keys.includes(target)) return draft;
  const rest = draft.order.filter((k) => !keys.includes(k));
  const at = rest.indexOf(target);
  if (at < 0) return draft;
  const adding = keys.filter((k) => !draft.order.includes(k));
  const withNew = adding.length
    ? { ...draft, order: [...draft.order, ...adding] }
    : draft;
  const placed = placeBlock(withNew, keys, at + (after ? 2 : 1));
  return adding.length
    ? { ...placed, history: [...draft.history, draft.order].slice(-MOST_UNDO) }
    : placed;
}

/** What Save would do, as the tools count it: switched on, switched off, and mods kept on whose place among the kept changed. */
export function summary(draft: Draft): {
  on: string[];
  off: string[];
  moved: number;
} {
  const was = new Set(draft.was);
  const now = new Set(draft.order);
  const on = draft.order.filter((k) => !was.has(k));
  const off = draft.was.filter((k) => !now.has(k));
  const keptWas = draft.was.filter((k) => now.has(k));
  const keptNow = draft.order.filter((k) => was.has(k));
  const moved = keptWas.filter((k, n) => k !== keptNow[n]).length;
  return { on, off, moved };
}

export function unsaved(draft: Draft): boolean {
  return !same(draft.order, draft.was);
}

/** The ids Save sends: each key's id as the list holds it, else as the mod's own files give it. */
export function idsOf(
  keys: string[],
  listing: ModsListing,
  listKey: string,
): string[] {
  const ids = new Map<string, string>();
  for (const mod of listing.mods) ids.set(mod.key, mod.id);
  for (const entry of listing.lists.find((l) => l.key === listKey)?.entries ??
    [])
    ids.set(entry.key, entry.id);
  return keys.map((k) => ids.get(k) ?? k);
}

/**
 * What each mod on the draft should be warned of, from its own files: a need none of whose mods is on, a mod it loads after that
 * sits below it, a mod it loads before that sits above it, a mod it refuses that is on, and files not on this PC. Worked out as
 * the draft stands, so a move shows its effect before Save; the tools' check after Save is the fuller one.
 */
export function marks(
  draft: Draft,
  mods: Map<string, ModRow>,
): Map<string, Mark[]> {
  const place = new Map<string, number>();
  draft.order.forEach((k, n) => {
    place.set(k, n);
    const id = mods.get(k)?.id.toLowerCase();
    if (id) place.set(id, n);
  });
  const name = (key: string) => mods.get(key)?.name ?? key;
  const found = new Map<string, Mark[]>();
  draft.order.forEach((key, here) => {
    const mod = mods.get(key);
    const said: Mark[] = [];
    if (!mod) said.push({ kind: "absent", other: "" });
    for (const any of mod?.need_ids ?? []) {
      if (!any.some((id) => place.has(id.toLowerCase())))
        said.push({ kind: "needs", other: any[0] ?? "" });
    }
    for (const id of mod?.load_after ?? []) {
      const there = place.get(id.toLowerCase());
      if (there !== undefined && there > here)
        said.push({ kind: "after", other: nameAt(draft, there, name) });
    }
    for (const id of mod?.load_before ?? []) {
      const there = place.get(id.toLowerCase());
      if (there !== undefined && there < here)
        said.push({ kind: "before", other: nameAt(draft, there, name) });
    }
    for (const id of mod?.incompatible ?? []) {
      const there = place.get(id.toLowerCase());
      if (there !== undefined)
        said.push({ kind: "refuses", other: nameAt(draft, there, name) });
    }
    if (said.length) found.set(key, said);
  });
  return found;
}

function nameAt(
  draft: Draft,
  at: number,
  name: (key: string) => string,
): string {
  return name(draft.order[at] ?? "");
}

/** The mods on this PC that the draft does not have, by name: the left-hand list. */
export function offKeys(draft: Draft, listing: ModsListing): string[] {
  const on = new Set(draft.order);
  return listing.mods
    .filter((m) => !on.has(m.key))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => m.key);
}

/** Whether a mod fits a filter: its name, id or authors hold the words. */
export function fitsFilter(
  mod: ModRow | undefined,
  fallback: string,
  filter: string,
): boolean {
  const wanted = filter.trim().toLowerCase();
  if (!wanted) return true;
  return [fallback, mod?.name ?? "", mod?.id ?? "", mod?.authors ?? ""].some(
    (w) => w.toLowerCase().includes(wanted),
  );
}

/** The keys from one row to another of a shown list, inclusive, for Shift + click. */
export function range(shown: string[], from: string, to: string): string[] {
  const a = shown.indexOf(from);
  const b = shown.indexOf(to);
  if (a < 0 || b < 0) return [to];
  return shown.slice(Math.min(a, b), Math.max(a, b) + 1);
}
