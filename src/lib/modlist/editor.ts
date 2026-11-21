import type { ListEntry, ModRow, ModsListing } from "./types";

/** Which mods the editor shows: those switched on, those switched off, or both (0.46.0). */
export type Show = "on" | "off" | "both";
/** Where the mods it shows come from. */
export type From = "all" | "workshop" | "local" | "game";

/** A mod on the list, in its place (1 is first); `mod` is null when its files are not on this PC. */
export type OnRow = { place: number; entry: ListEntry; mod: ModRow | null };

export function byKey(listing: ModsListing): Map<string, ModRow> {
  return new Map(listing.mods.map((m) => [m.key, m]));
}

export function onRows(listing: ModsListing, listKey: string): OnRow[] {
  const mods = byKey(listing);
  const list = listing.lists.find((l) => l.key === listKey);
  return (list?.entries ?? []).map((entry, index) => ({
    place: index + 1,
    entry,
    mod: mods.get(entry.key) ?? null,
  }));
}

/** The mods on this PC that the list does not have, by name. */
export function offRows(listing: ModsListing, listKey: string): ModRow[] {
  const list = listing.lists.find((l) => l.key === listKey);
  const on = new Set((list?.entries ?? []).map((e) => e.key));
  return listing.mods
    .filter((m) => !on.has(m.key))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A row's name: the mod's own, else the name a check remembered, else the id the list holds. */
export function nameOf(row: OnRow): string {
  return row.mod?.name || row.entry.remembered || row.entry.id;
}

function found(words: string[], search: string): boolean {
  const wanted = search.trim().toLowerCase();
  return wanted === "" || words.some((w) => w.toLowerCase().includes(wanted));
}

/** Whether a mod fits the search (its name, id or authors) and where it comes from. */
export function fits(
  mod: ModRow | null,
  fallbackName: string,
  search: string,
  from: From,
): boolean {
  if (from !== "all" && mod?.source !== from) return false;
  return found(
    [fallbackName, mod?.name ?? "", mod?.id ?? "", mod?.authors ?? ""],
    search,
  );
}

/** A place typed into the box: a whole number from 1 to the list's length, else null. */
export function placeFrom(text: string, length: number): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const place = Number(trimmed);
  return place >= 1 && place <= length ? place : null;
}

/** The listing with one list as a change left it (the kit answers with its ids and keys), remembered names kept. */
export function withList(
  listing: ModsListing,
  listKey: string,
  ids: string[],
  keys: string[],
  step: 1 | -1,
): ModsListing {
  return {
    ...listing,
    lists: listing.lists.map((list) => {
      if (list.key !== listKey) return list;
      const remembered = new Map(
        list.entries.map((e) => [e.key, e.remembered]),
      );
      const entries = ids.map((id, n) => ({
        id,
        key: keys[n] ?? id,
        remembered: remembered.get(keys[n] ?? id) ?? "",
      }));
      return { ...list, entries, count: entries.length };
    }),
    changes: {
      ...listing.changes,
      [listKey]: Math.max(0, (listing.changes[listKey] ?? 0) + step),
    },
  };
}

/**
 * The keys with the chosen ones taken out and put back as one block, in their list order, starting at `place` (1 is first,
 * counted without them), as the kit's `--move ... --to PLACE` does (0.47.0).
 */
export function withBlockAt(
  keys: string[],
  chosen: ReadonlySet<string>,
  place: number,
): string[] {
  const block = keys.filter((k) => chosen.has(k));
  const rest = keys.filter((k) => !chosen.has(k));
  const at = Math.max(0, Math.min(place - 1, rest.length));
  return [...rest.slice(0, at), ...block, ...rest.slice(at)];
}

/** Where the chosen block starts now, counted without it (1 is first): the mods not chosen before the first chosen, plus one. */
export function blockPlace(
  keys: string[],
  chosen: ReadonlySet<string>,
): number {
  const first = keys.findIndex((k) => chosen.has(k));
  if (first < 0) return 1;
  return keys.slice(0, first).filter((k) => !chosen.has(k)).length + 1;
}

/** The place (counted without the block) that puts it just after or just before a mod; null for a mod in the block or not listed. */
export function placeBeside(
  keys: string[],
  chosen: ReadonlySet<string>,
  target: string,
  after: boolean,
): number | null {
  if (chosen.has(target)) return null;
  const rest = keys.filter((k) => !chosen.has(k));
  const at = rest.indexOf(target);
  if (at < 0) return null;
  return at + (after ? 2 : 1);
}

/** The keys that carry a block, and how far each moves it: one place, ten, or to either end (0.47.0). */
export const CARRY_STEPS: Record<string, number> = {
  ArrowUp: -1,
  ArrowDown: 1,
  PageUp: -10,
  PageDown: 10,
  Home: -Infinity,
  End: Infinity,
};

/** A carried block's place moved by a step, kept between the first place and the last (the list without it, plus one). */
export function nudged(place: number, step: number, others: number): number {
  return Math.max(1, Math.min(place + step, others + 1));
}

/** A mod the finder can offer: its key, its name, its id, and (when on the list) its place. */
export type Findable = {
  key: string;
  name: string;
  id: string;
  place?: number;
};

/** The mods whose name or id holds the words, names that start with them first, at most `most` (the finder's offers). */
export function matching(
  mods: Findable[],
  search: string,
  most = 8,
): Findable[] {
  const wanted = search.trim().toLowerCase();
  if (wanted === "") return [];
  const starts: Findable[] = [];
  const holds: Findable[] = [];
  for (const mod of mods) {
    const name = mod.name.toLowerCase();
    if (name.startsWith(wanted)) starts.push(mod);
    else if (name.includes(wanted) || mod.id.toLowerCase().includes(wanted))
      holds.push(mod);
  }
  return [...starts, ...holds].slice(0, most);
}

/** Choosing a mod: ticked again, it is let go; the order kept is the order chosen. */
export function toggled(chosen: string[], key: string): string[] {
  return chosen.includes(key)
    ? chosen.filter((k) => k !== key)
    : [...chosen, key];
}
