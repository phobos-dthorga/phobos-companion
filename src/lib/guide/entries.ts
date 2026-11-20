import { inlineSegments, type Segment } from "../shell/inline";
import { PAGE_NAMES, type PageName } from "../navigation/place";

/**
 * The Guide (0.34.0; the owner, 20 Nov 2026: "documentation, or an encyclopedia, into the Companion, so I know what to do or how
 * to find something"). Each entry is a file in `guide/`, written in plain words: a few header lines, then short paragraphs, lists
 * and links to other entries. They are built into the window, so the Guide needs nothing from the host.
 *
 *     ---
 *     title: Go back to an older version of a mod
 *     kind: task                     (task: How do I…? · page: one of the pages · term: a word the Companion uses)
 *     page: mods                     (a page entry's page; F1 on that page opens it)
 *     go: mods?panel=settings        (Take me there: a page, and what it should show)
 *     words: restore, undo, rollback (more words a search finds it by)
 *     see: term-backup, page-mods    (See also)
 *     ---
 *     Short paragraphs. **Bold** for what to press or must not miss; `code` for names.
 *     1. Numbered steps.
 *     - Bullets.
 *     ### A small heading
 *     A link to another entry: [backups](term-backup).
 */
export type GuideKind = "task" | "page" | "term";

export type Block =
  | { kind: "para"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

export type Destination = { page: PageName; focus: Record<string, string> };

export type GuideEntry = {
  id: string;
  kind: GuideKind;
  title: string;
  page: PageName | null;
  go: Destination | null;
  words: string[];
  see: string[];
  blocks: Block[];
  /** Everything it says, plain, for searching. */
  text: string;
};

export const KINDS: GuideKind[] = ["task", "page", "term"];
/** Each kind's words, by literal key so the catalogue check can read them. */
export const GUIDE_KIND_WORDS: Record<GuideKind, string> = {
  task: "guide-kind-task",
  page: "guide-kind-page",
  term: "guide-kind-term",
};
const HEADER_KEYS = ["title", "kind", "page", "go", "words", "see"];

function isPage(name: string): name is PageName {
  return (PAGE_NAMES as readonly string[]).includes(name);
}

/** Where Take me there leads: `settings?panel=records` is the Settings page, its records panel in view. */
export function destination(text: string): Destination {
  const [page, query = ""] = text.trim().split("?", 2);
  if (!isPage(page)) throw new Error(`go: ${page} is not a page`);
  return { page, focus: Object.fromEntries(new URLSearchParams(query)) };
}

function list(text: string | undefined): string[] {
  return (text ?? "")
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);
}

/** One entry from its file; an error names what is wrong, so a broken entry fails the tests instead of showing half. */
export function parseEntry(id: string, raw: string): GuideEntry {
  const text = raw.replace(/\r\n/g, "\n").replace(/^﻿/, "");
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`${id}: no header between --- lines`);
  const header: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim()) continue;
    const at = line.indexOf(":");
    const key = line.slice(0, at).trim();
    if (at < 0 || !HEADER_KEYS.includes(key))
      throw new Error(
        `${id}: header line "${line}" is not one of ${HEADER_KEYS.join(", ")}`,
      );
    header[key] = line.slice(at + 1).trim();
  }
  const kind = header.kind as GuideKind;
  if (!KINDS.includes(kind))
    throw new Error(`${id}: kind must be task, page or term`);
  if (!header.title) throw new Error(`${id}: it has no title`);
  if (kind === "page" && !isPage(header.page ?? ""))
    throw new Error(`${id}: a page entry names its page`);
  const blocks = parseBlocks(match[2]);
  if (blocks.length === 0) throw new Error(`${id}: it says nothing`);
  const plain = blocks
    .flatMap((b) => (b.kind === "list" ? b.items : [b.text]))
    .map((line) => plainText(line))
    .join(" ");
  return {
    id,
    kind,
    title: header.title,
    page: kind === "page" ? (header.page as PageName) : null,
    go: header.go ? destination(header.go) : null,
    words: list(header.words),
    see: list(header.see),
    blocks,
    text: plain,
  };
}

function parseBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const close = () => {
    if (paragraph.length)
      blocks.push({ kind: "para", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    const bullet = /^- (.*)$/.exec(line);
    const step = /^\d+\. (.*)$/.exec(line);
    const heading = /^### (.*)$/.exec(line);
    if (!line) {
      close();
    } else if (heading) {
      close();
      blocks.push({ kind: "heading", text: heading[1] });
    } else if (bullet || step) {
      close();
      const ordered = Boolean(step);
      const item = (bullet ?? step)![1];
      const last = blocks.at(-1);
      if (last?.kind === "list" && last.ordered === ordered)
        last.items.push(item);
      else blocks.push({ kind: "list", ordered, items: [item] });
    } else if (
      raw.startsWith("  ") &&
      blocks.at(-1)?.kind === "list" &&
      paragraph.length === 0
    ) {
      const last = blocks.at(-1) as Extract<Block, { kind: "list" }>;
      last.items[last.items.length - 1] += ` ${line}`;
    } else {
      paragraph.push(line);
    }
  }
  close();
  return blocks;
}

/** A piece of a line: a link to another entry, or text in its style. */
export type Piece = Segment | { style: "link"; text: string; id: string };

const LINK = /\[([^\]]+)\]\(([a-z0-9-]+)\)/g;

/** A line's pieces: links to other entries, and the rest with its **bold** and `code`. Never treated as markup. */
export function pieces(line: string): Piece[] {
  const found: Piece[] = [];
  let at = 0;
  for (const match of line.matchAll(LINK)) {
    found.push(...inlineSegments(line.slice(at, match.index)));
    found.push({ style: "link", text: match[1], id: match[2] });
    at = (match.index ?? 0) + match[0].length;
  }
  found.push(...inlineSegments(line.slice(at)));
  return found;
}

function plainText(line: string): string {
  return pieces(line)
    .map((piece) => piece.text)
    .join("");
}

/** Every entry a line or a See also links to. */
export function linksOf(entry: GuideEntry): string[] {
  const inLines = entry.blocks
    .flatMap((b) => (b.kind === "list" ? b.items : [b.text]))
    .flatMap((line) => [...line.matchAll(LINK)].map((m) => m[2]));
  return [...new Set([...inLines, ...entry.see])];
}

const files = import.meta.glob("../../../guide/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Every entry, by kind (tasks, pages, terms) and then by title. */
export const ENTRIES: GuideEntry[] = Object.entries(files)
  .map(([path, raw]) =>
    parseEntry(path.split("/").pop()!.replace(/\.md$/, ""), raw),
  )
  .sort(
    (a, b) =>
      KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) ||
      a.title.localeCompare(b.title),
  );

export function entry(id: string): GuideEntry | undefined {
  return ENTRIES.find((e) => e.id === id);
}

/** The entry F1 opens on a page. */
export function pageEntry(page: PageName): GuideEntry | undefined {
  return ENTRIES.find((e) => e.kind === "page" && e.page === page);
}

/**
 * Entries every word of the search is found in, surest first: a word in the title counts most, then the extra search words,
 * then the text. Case and accents are ignored.
 */
export function search(
  query: string,
  entries: GuideEntry[] = ENTRIES,
): GuideEntry[] {
  const fold = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored = entries
    .map((e) => {
      const title = fold(e.title);
      const extra = fold(e.words.join(" "));
      const body = fold(e.text);
      let score = 0;
      for (const word of words) {
        if (title.includes(word)) score += 10;
        else if (extra.includes(word)) score += 6;
        else if (body.includes(word)) score += 1;
        else return null;
      }
      return { e, score: score + (e.kind === "task" ? 1 : 0) };
    })
    .filter(
      (found): found is { e: GuideEntry; score: number } => found !== null,
    );
  return scored.sort((a, b) => b.score - a.score).map((found) => found.e);
}
