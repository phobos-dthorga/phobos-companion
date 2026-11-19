import type { EntryRequest } from "../code/types";
import type { StoodRequest } from "../timeline/types";

/** Every page, in the bar's order. */
export const PAGE_NAMES = [
  "home",
  "mods",
  "tests",
  "logs",
  "memory",
  "gamefiles",
  "atlas",
  "changes",
  "timeline",
  "codemap",
  "makeup",
  "reports",
  "settings",
  "decisions",
  "about",
] as const;

export type PageName = (typeof PAGE_NAMES)[number];

/** A dialog over the window that the trail keeps, so Back closes it and Forward opens it again. */
export type Dialog =
  | { kind: "code"; request: EntryRequest }
  | { kind: "stood"; request: StoodRequest };

/**
 * Where the owner is: a page, a game, what is chosen on the page (its focus: a changelog, a method, a test row...) and any dialog
 * open over it. The focus keys each page reads are listed in docs/cross-links.md (N3).
 */
export type Place = {
  page: PageName;
  game: string | null;
  focus: Record<string, string>;
  dialog: Dialog | null;
};

export const SCHEME = "dthorga://";
const MAX_VALUE = 600;
const GAME = /^[A-Za-z0-9._-]{1,80}$/;
const FOCUS_KEY = /^[a-z][a-z-]{0,30}$/;

export function place(
  page: PageName,
  game: string | null = null,
  focus: Record<string, string> = {},
): Place {
  return { page, game, focus, dialog: null };
}

/** Whether two places show the same page, game and focus, whatever dialog is open. */
export function samePage(a: Place, b: Place): boolean {
  return a.page === b.page && a.game === b.game && sameFocus(a.focus, b.focus);
}

export function samePlace(a: Place, b: Place): boolean {
  return (
    samePage(a, b) && JSON.stringify(a.dialog) === JSON.stringify(b.dialog)
  );
}

function sameFocus(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => (a[key] ?? "") === (b[key] ?? ""));
}

/** A place written as an address: dthorga://page/game?focus=value&dialog=code&dialog.changelog=... */
export function addressOf(where: Place): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(where.focus))
    if (value) query.set(key, value);
  if (where.dialog?.kind === "code") {
    const r = where.dialog.request;
    query.set("dialog", "code");
    query.set("dialog.repository", r.repository);
    query.set("dialog.changelog", r.changelog);
    query.set("dialog.product", r.product);
    query.set("dialog.version", r.entry.version);
    query.set("dialog.text", r.entry.text);
    if (r.commit) query.set("dialog.commit", r.commit);
  } else if (where.dialog?.kind === "stood") {
    const r = where.dialog.request;
    query.set("dialog", "stood");
    query.set("dialog.repository", r.repository);
    query.set("dialog.changelog", r.changelog);
    query.set("dialog.product", r.product);
    if (r.commit) query.set("dialog.commit", r.commit);
    if (r.when) query.set("dialog.when", r.when);
  }
  const text = query.toString();
  return `${SCHEME}${where.page}/${where.game ?? ""}${text ? `?${text}` : ""}`;
}

/** An address read back into a place; null when it is not one, or holds anything malformed. */
export function placeOf(address: string): Place | null {
  const text = address.trim();
  if (!text.startsWith(SCHEME) || text.length > 4000) return null;
  const [path, query = ""] = text.slice(SCHEME.length).split("?", 2);
  const [page, game = ""] = path.split("/", 2);
  if (!(PAGE_NAMES as readonly string[]).includes(page)) return null;
  if (game && !GAME.test(game)) return null;
  const params = new URLSearchParams(query);
  const focus: Record<string, string> = {};
  const dialogParts: Record<string, string> = {};
  let dialogKind: string | null = null;
  for (const [key, value] of params) {
    if (value.length > MAX_VALUE || /[\r\n\0]/.test(value)) return null;
    if (key === "dialog") dialogKind = value;
    else if (key.startsWith("dialog.")) dialogParts[key.slice(7)] = value;
    else if (FOCUS_KEY.test(key)) focus[key] = value;
    else return null;
  }
  let dialog: Dialog | null = null;
  const need = (...keys: string[]) => keys.every((k) => dialogParts[k]);
  if (dialogKind === "code" && need("repository", "changelog", "text")) {
    const lead = dialogParts.text;
    dialog = {
      kind: "code",
      request: {
        repository: dialogParts.repository,
        changelog: dialogParts.changelog,
        product: dialogParts.product ?? "",
        entry: {
          version: dialogParts.version ?? "",
          section: "",
          text: lead,
          lead,
        },
        commit: dialogParts.commit ?? null,
      },
    };
  } else if (
    dialogKind === "stood" &&
    need("repository", "changelog") &&
    (dialogParts.commit || dialogParts.when)
  ) {
    dialog = {
      kind: "stood",
      request: {
        repository: dialogParts.repository,
        changelog: dialogParts.changelog,
        product: dialogParts.product ?? "",
        commit: dialogParts.commit ?? null,
        when: dialogParts.when ?? null,
      },
    };
  } else if (dialogKind !== null) {
    return null;
  }
  return { page: page as PageName, game: game || null, focus, dialog };
}
