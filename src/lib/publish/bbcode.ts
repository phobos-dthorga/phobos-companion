/**
 * A Workshop page's BBCode as a tree, for the Publish page's live preview (0.69.0). Only the tags the kit allows on a page
 * (phobos-modkit `steam/bbcode.py`: h1, h2, h3, b, i, u, list with its [*] items, and url=https://...) become anything; every other
 * bracket stays as text. The tree is drawn by Svelte as elements and text, never as HTML, so nothing in a page can become markup
 * or script, and a link is shown, never followed.
 */

export type BbTag =
  "h1" | "h2" | "h3" | "b" | "i" | "u" | "list" | "item" | "url";

export type BbNode =
  | { kind: "text"; text: string }
  | { kind: BbTag; url?: string; children: BbNode[] };

const TOKEN = /\[(\/?)(h1|h2|h3|b|i|u|list|url)(?:=([^\]\s]*))?\]|\[\*\]/g;
const URL = /^https?:\/\/[^\s[\]<>]+$/;
/** Tags that stand on their own lines: a line break just after one is Steam's spacing, not a blank line. */
const BLOCKS = new Set<BbTag>(["h1", "h2", "h3", "list", "item"]);

type Open = { kind: BbTag; url?: string; children: BbNode[] };

/** Where the innermost open tag of a kind is, or -1. */
function lastOf(stack: Open[], kind: BbTag): number {
  for (let index = stack.length - 1; index >= 0; index--)
    if (stack[index].kind === kind) return index;
  return -1;
}

/** The page's text as a tree of nodes. */
export function parseBbcode(text: string): BbNode[] {
  const root: Open = { kind: "b", children: [] };
  const stack: Open[] = [root];
  const top = () => stack[stack.length - 1];
  const addText = (value: string) => {
    if (!value) return;
    const last = top().children.at(-1);
    if (last && last.kind === "text") last.text += value;
    else top().children.push({ kind: "text", text: value });
  };
  /** An item's own line break before the next item or the list's end is Steam's spacing, not text. */
  const endItem = () => {
    const open = top();
    if (open.kind !== "item") return;
    const last = open.children.at(-1);
    if (last && last.kind === "text")
      last.text = last.text.replace(/\r?\n$/, "");
  };
  let at = 0;
  let afterBlock = false;
  for (const match of text.matchAll(TOKEN)) {
    let between = text.slice(at, match.index);
    if (afterBlock) between = between.replace(/^\r?\n/, "");
    addText(between);
    at = match.index + match[0].length;
    afterBlock = false;
    if (match[0] === "[*]") {
      const inList = lastOf(stack, "list");
      if (inList < 0) {
        addText(match[0]);
        continue;
      }
      endItem();
      stack.length = inList + 1;
      const item: Open = { kind: "item", children: [] };
      top().children.push(item);
      stack.push(item);
      continue;
    }
    const [, closing, name, value] = match;
    const kind = name as BbTag;
    if (closing) {
      const opened = lastOf(stack, kind);
      if (opened <= 0) {
        addText(match[0]);
        continue;
      }
      if (kind === "list") endItem();
      stack.length = opened;
      afterBlock = BLOCKS.has(kind);
      continue;
    }
    if (kind === "url" && !(value && URL.test(value))) {
      addText(match[0]);
      continue;
    }
    if (kind !== "url" && value !== undefined) {
      addText(match[0]);
      continue;
    }
    const open: Open = {
      kind,
      children: [],
      ...(kind === "url" ? { url: value } : {}),
    };
    top().children.push(open);
    stack.push(open);
    afterBlock = kind === "list";
  }
  let rest = text.slice(at);
  if (afterBlock) rest = rest.replace(/^\r?\n/, "");
  addText(rest);
  return root.children;
}

/** A text's size as Steam counts it: UTF-8 bytes. */
export function bytesOf(text: string): number {
  return new TextEncoder().encode(text).length;
}
