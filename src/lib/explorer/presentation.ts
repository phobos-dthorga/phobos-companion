import { LOCALE } from "../i18n/runtime";
import type { KindPage, OwnerKind, Path, Ready, Released } from "./types";

export { formatMemory } from "../memory/presentation";

/** How many of a kind's objects, or of a list's items, show at a time (the host takes at most 500). */
export const PAGE_SIZE = 50;
/** How many rows of the overview's tables show at a time. */
export const TABLE_PAGE = 25;
/** How many objects of a kind "Why is it still in memory?" follows a path to, each a different one. */
export const WHY_SAMPLE = 3;
/** How many holders "What holds it" lists. */
export const HOLDERS_MAX = 50;
/** The longest word filter the host takes. */
export const MAX_MATCH = 80;

/** A count as a person reads it: 28,350,237. */
export function formatCount(count: number): string {
  return count.toLocaleString(LOCALE);
}

/** Whole seconds left before a held snapshot is let go, counted down from its first line; never below nought. */
export function secondsLeft(
  ready: Pick<Ready, "limitSeconds" | "ageSeconds">,
  receivedAtMs: number,
  nowMs: number,
): number {
  const held = (ready.ageSeconds || 0) + (nowMs - receivedAtMs) / 1000;
  return Math.max(0, Math.ceil(ready.limitSeconds - held));
}

/** Seconds as a clock reads them: 9:05. */
export function clockOf(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** The words key for who a kind belongs to. */
export function ownerKindKey(kind: OwnerKind): string {
  return {
    mod: "explorer-owner-mod",
    game: "explorer-owner-game",
    runtime: "explorer-owner-runtime",
    unknown: "explorer-owner-unknown",
  }[kind];
}

/** The words key for why a snapshot is no longer held: the host's reasons, or the person leaving the page. */
export function releasedKey(reason: Released | "left"): string {
  return {
    limit: "explorer-released-limit",
    asked: "explorer-released-asked",
    ended: "explorer-released-ended",
    gone: "explorer-released-gone",
    left: "explorer-released-left",
  }[reason];
}

/** Where a path starts, in words: the static field holding it, or the kind of root. */
export function rootWords(path: Path): {
  key: string;
  args: Record<string, string>;
} {
  if (path.static)
    return { key: "explorer-root-static", args: { name: path.static } };
  const known: Record<string, string> = {
    Stack: "explorer-root-stack",
    StrongHandle: "explorer-root-handle",
    PinnedHandle: "explorer-root-pinned",
    FinalizerQueue: "explorer-root-finalizer",
    ThreadStaticVar: "explorer-root-thread-static",
  };
  return known[path.root]
    ? { key: known[path.root], args: {} }
    : { key: "explorer-root-other", args: { root: path.root } };
}

/** The first item a page shows. Pages count from 1. */
export function skipOf(page: number, size = PAGE_SIZE): number {
  return (Math.max(1, Math.floor(page) || 1) - 1) * size;
}

/**
 * What the shared pager shows for a page asked of the host: how many pages there are when the whole count is known, or none
 * (only "next" when there are more) when a filter hides how many match.
 */
export function pagerOf(
  page: number,
  shown: number,
  total: number | null,
  size = PAGE_SIZE,
): {
  page: number;
  pages: number | null;
  first: number;
  last: number;
  total: number | null;
} {
  const first = shown > 0 ? skipOf(page, size) + 1 : 0;
  return {
    page,
    pages: total === null ? null : Math.max(1, Math.ceil(total / size)),
    first,
    last: shown > 0 ? first + shown - 1 : 0,
    total,
  };
}

/** A kind's page as the pager shows it: by its whole count, unless a word filter hides how many match. */
export function kindPager(kind: KindPage, page: number) {
  return pagerOf(page, kind.items.length, kind.match ? null : kind.count);
}

/** What the page shows, from the place: the start, the overview, one kind, one object, the live checks (0.91.0), or word that an
 * object is gone. */
export type View =
  | { name: "start" }
  | { name: "overview" }
  | {
      name: "kind";
      kind: string;
      match: string;
      largest: boolean;
      page: number;
    }
  | { name: "object"; token: string }
  | { name: "checks" }
  | { name: "gone"; was: "kind" | "object" };

/**
 * Reads the place's focus (`view`, `kind`, `object`, `snapshot`, `match`, `largest`, `page`) against the snapshot held now. An
 * object belongs to the snapshot it was found in: a step back to one from an earlier snapshot is gone, never a failed request.
 */
export function viewOf(
  focus: Record<string, string>,
  held: number | null,
  known: (token: string) => boolean,
): View {
  const view = focus.view ?? "";
  if (held === null)
    return view === "kind" || view === "object"
      ? { name: "gone", was: view }
      : { name: "start" };
  if (view === "checks") return { name: "checks" };
  if (view === "object")
    return focus.snapshot === String(held) && known(focus.object ?? "")
      ? { name: "object", token: focus.object! }
      : { name: "gone", was: "object" };
  if (view === "kind" && focus.kind)
    return {
      name: "kind",
      kind: focus.kind,
      match: (focus.match ?? "").slice(0, MAX_MATCH),
      largest: focus.largest === "yes",
      page: Math.max(1, Number.parseInt(focus.page ?? "", 10) || 1),
    };
  return { name: "overview" };
}

/** The last part of a type's name, for a heading: `Verse.Pawn` is Pawn; a generic keeps its arguments. */
export function shortName(type: string): string {
  const open = type.indexOf("<");
  const head = open >= 0 ? type.slice(0, open) : type;
  const dot = head.lastIndexOf(".");
  return dot >= 0 ? type.slice(dot + 1) : type;
}
