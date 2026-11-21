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
