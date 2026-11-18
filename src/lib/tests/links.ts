import type { TestList, TestRow } from "./types";
import { shelfOf, type Shelf } from "./presentation";

const STILL_WAITING = new Set<Shelf>(["waiting", "seen", "check"]);

/** Where the code notes a key (kit 1.36.0 `test-pass code`): the string's place, the thing holding it, the rows it stands for. */
export type CodePlace = {
  key: string;
  /** The key is a prefix the code finishes at run time. */
  prefix: boolean;
  file: string;
  line: number;
  thing: { id: string; name: string; kind: string } | null;
  rows: string[];
};

export type CodePlaces = {
  doc: string;
  places: CodePlace[];
  unplaced: string[];
};

/** The things that note a row's keys, each once, in the order the code holds them. */
export function codeOfRow(
  places: CodePlace[],
  row: string,
): { thing: NonNullable<CodePlace["thing"]>; file: string; line: number }[] {
  const seen = new Set<string>();
  const found = [];
  for (const place of places) {
    if (!place.thing || !place.rows.includes(row)) continue;
    if (seen.has(place.thing.id)) continue;
    seen.add(place.thing.id);
    found.push({ thing: place.thing, file: place.file, line: place.line });
  }
  return found;
}

/**
 * The rows watching a thing: those whose keys it notes itself, or one of its members does (a type watches what its methods note).
 * Each row once, in the list's order.
 */
export function rowsWatching(places: CodePlace[], id: string): string[] {
  const rows = new Set<string>();
  for (const place of places) {
    const holder = place.thing?.id;
    if (holder && (holder === id || holder.startsWith(`${id}.`)))
      for (const row of place.rows) rows.add(row);
  }
  return [...rows];
}

/**
 * The rows still waiting on a version of a product: rows whose newest version of that product is this one, with no verdict yet
 * (waiting, seen working, or to look into). Rows name versions by product as the test list's `versionNames` say, so a product the list does not name has none.
 */
export function waitingOn(
  lists: TestList[],
  product: string,
  version: string,
): { repository: string; row: TestRow }[] {
  const found = [];
  for (const list of lists)
    for (const row of list.rows)
      if (
        row.versions?.[product] === version &&
        STILL_WAITING.has(shelfOf(row))
      )
        found.push({ repository: list.repository, row });
  return found;
}

/** A row by its id in one repository's list. */
export function rowOf(
  lists: TestList[],
  repository: string,
  id: string,
): TestRow | null {
  return (
    lists
      .find((list) => list.repository === repository)
      ?.rows.find((row) => row.id === id) ?? null
  );
}
