/** A piece of a line of Markdown: plain, bold or code. */
export type Segment = { text: string; style: "plain" | "bold" | "code" };

const TOKEN = /(\*\*[^*\n]+?\*\*|`[^`\n]+`)/;

/**
 * A changelog entry's text in pieces, for showing **bold** and `code` as such without ever turning the text into markup. Only
 * those two are read; anything else (a lone asterisk, an unclosed pair) stays as written.
 */
export function inlineSegments(text: string): Segment[] {
  const found: Segment[] = [];
  for (const piece of text.split(TOKEN)) {
    if (!piece) continue;
    if (piece.length > 4 && piece.startsWith("**") && piece.endsWith("**")) {
      found.push({ text: piece.slice(2, -2), style: "bold" });
    } else if (
      piece.length > 2 &&
      piece.startsWith("`") &&
      piece.endsWith("`")
    ) {
      found.push({ text: piece.slice(1, -1), style: "code" });
    } else {
      found.push({ text: piece, style: "plain" });
    }
  }
  return found;
}

/** The text a person reads, without the marks: for labels and headings that cannot hold styling. */
export function plainText(text: string): string {
  return inlineSegments(text)
    .map((segment) => segment.text)
    .join("");
}

/** Consecutive items that came from one commit, in order. Items no commit holds yet share a run of their own. */
export function commitRuns<T extends { commit?: string | null }>(
  items: T[],
): T[][] {
  const runs: T[][] = [];
  for (const item of items) {
    const last = runs.at(-1);
    if (last && (last[0].commit ?? null) === (item.commit ?? null)) {
      last.push(item);
    } else {
      runs.push([item]);
    }
  }
  return runs;
}
