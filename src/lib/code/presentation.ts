export { formatDay } from "../shell/dates";
import type { DiffLine, FileChange, FileKind, Hunk } from "./types";

/** How the viewer shows a file: everything that changed, or only the code as it now stands. */
export type ViewMode = "changes" | "new" | "connections";

/** The kinds of file, in the order they are listed, each with its heading as a message key. */
export const KIND_WORDS: Record<FileKind, string> = {
  code: "code-kind-code",
  data: "code-kind-data",
  words: "code-kind-words",
  other: "code-kind-other",
};

export const KINDS: FileKind[] = ["code", "data", "words", "other"];

/** What happened to a file, as a message key. */
export const CHANGE_WORDS: Record<FileChange["change"], string> = {
  added: "code-file-added",
  changed: "code-file-changed",
  removed: "code-file-removed",
  renamed: "code-file-renamed",
};

/** A line's mark, so added and removed never rest on colour alone. */
export const LINE_MARKS: Record<DiffLine["kind"], string> = {
  "+": "+",
  "-": "−",
  " ": "",
};

/** The files of each kind, in order, leaving out kinds with none. */
export function byKind(
  files: FileChange[],
): { kind: FileKind; files: FileChange[] }[] {
  return KINDS.map((kind) => ({
    kind,
    files: files.filter((file) => file.kind === kind),
  })).filter((group) => group.files.length > 0);
}

/** A path as its folder and its name, so the name can stand out. */
export function pathParts(path: string): { folder: string; name: string } {
  const cut = path.lastIndexOf("/");
  return cut < 0
    ? { folder: "", name: path }
    : { folder: path.slice(0, cut + 1), name: path.slice(cut + 1) };
}

const TEST_FOLDER = /(^|\/)(tests?|specs?|__tests__)\//i;
const TEST_NAME = /(^test_|[._-](test|spec)\.[^.]+$|tests\.[^.]+$)/i;

/** Whether a file is a test of the code, by the folder or the name tests are given in most projects. */
export function isTest(path: string): boolean {
  return TEST_FOLDER.test(path) || TEST_NAME.test(pathParts(path).name);
}

/**
 * The file to show first: among the first kind present, the one with the most new lines, and the code itself before its tests
 * (a test is often the longest new file, and the least like what the entry describes).
 */
export function firstFile(files: FileChange[]): FileChange | null {
  const first = byKind(files)[0];
  if (!first) return null;
  const own = first.files.filter((file) => !isTest(file.path));
  return (own.length > 0 ? own : first.files).reduce((best, file) =>
    file.additions > best.additions ? file : best,
  );
}

/** The lines a mode shows: removed lines are left out of "the code as it now stands". */
export function shownLines(hunk: Hunk, mode: ViewMode): DiffLine[] {
  return mode === "new"
    ? hunk.lines.filter((line) => line.kind !== "-")
    : hunk.lines;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const TOKEN = /(<span[^>]*>|<\/span>|\n)/;

/**
 * A highlighter's HTML for several lines, as one balanced piece of HTML per line. A span left open across a line break (a
 * comment or a string running over lines) is closed at the break and opened again on the next line.
 */
export function splitHighlighted(html: string): string[] {
  const lines: string[] = [];
  const open: string[] = [];
  let line = "";
  for (const piece of html.split(TOKEN)) {
    if (piece === "\n") {
      lines.push(line + "</span>".repeat(open.length));
      line = open.join("");
    } else if (piece === "</span>") {
      open.pop();
      line += piece;
    } else if (piece.startsWith("<span")) {
      open.push(piece);
      line += piece;
    } else {
      line += piece;
    }
  }
  lines.push(line + "</span>".repeat(open.length));
  return lines;
}

/**
 * The two sides of a hunk as text: the code as it was (unchanged and removed lines) and as it now stands (unchanged and added),
 * each highlighted whole so a construct running over several lines is still read right.
 */
export function sides(hunk: Hunk): { old: string; new: string } {
  return {
    old: hunk.lines
      .filter((line) => line.kind !== "+")
      .map((line) => line.text)
      .join("\n"),
    new: hunk.lines
      .filter((line) => line.kind !== "-")
      .map((line) => line.text)
      .join("\n"),
  };
}

/**
 * Each line of a hunk as HTML, given its two sides highlighted line by line: a removed line takes the old side's, every other
 * line the new side's. With no highlighting (null) the text is escaped as it is.
 */
export function hunkHtml(
  hunk: Hunk,
  oldLines: string[] | null,
  newLines: string[] | null,
): string[] {
  let oldAt = 0;
  let newAt = 0;
  return hunk.lines.map((line) => {
    const plain = escapeHtml(line.text);
    if (line.kind === "-") return oldLines?.[oldAt++] ?? plain;
    if (line.kind === " ") oldAt++;
    return newLines?.[newAt++] ?? plain;
  });
}

/** A commit's first eight characters. */
export function shortHash(hash: string): string {
  return hash.slice(0, 8);
}

/** An entry split into its bold opening and the rest; an entry with no bold opening is all rest. */
export function entryParts(entry: { text: string; lead: string }): {
  lead: string;
  rest: string;
} {
  const opening = `**${entry.lead}**`;
  return entry.text.startsWith(opening)
    ? { lead: entry.lead, rest: entry.text.slice(opening.length).trim() }
    : { lead: "", rest: entry.text };
}

/** An entry as it was written in a commit, without its bold marks, cut to a line. */
export function writtenWords(written: string, limit = 110): string {
  const plain = written.replaceAll("**", "");
  return plain.length > limit ? `${plain.slice(0, limit).trimEnd()}…` : plain;
}
