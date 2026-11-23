export { formatDay } from "../shell/dates";
import type {
  DiffLine,
  EntryRequest,
  FileChange,
  FileKind,
  Hunk,
} from "./types";

/**
 * How the viewer shows a file: everything that changed, only the code as it now stands, only the code as it was (0.78.0), or how
 * the things it changed connect.
 */
export type ViewMode = "changes" | "new" | "old" | "connections";

/** Whether a mode shows a line: removed lines are left out of the code as it now stands, added lines out of the code as it was. */
export function showsLine(mode: ViewMode, kind: DiffLine["kind"]): boolean {
  return mode === "new" ? kind !== "-" : mode === "old" ? kind !== "+" : true;
}

/** Where a thing a commit changed stood at that commit (phobos-modkit 1.112.0's `at`): its file and its first and last lines. */
export type At = { file: string; line: number; end: number };

/**
 * Which lines of a hunk belong to a thing that stood at `at` (0.78.0, docs/code-reading.md step 3), as their places in the hunk:
 * an unchanged or added line by its number as the code now stands; a removed line by where it was, the line before it.
 */
export function linesOf(hunk: Hunk, at: At): Set<number> {
  const found = new Set<number>();
  const first = hunk.lines.find((line) => line.new != null)?.new ?? 1;
  let before = first - 1;
  hunk.lines.forEach((line, index) => {
    if (line.kind === "-") {
      if (before >= at.line - 1 && before <= at.end) found.add(index);
      return;
    }
    const number = line.new ?? before + 1;
    if (number >= at.line && number <= at.end) found.add(index);
    before = number;
  });
  return found;
}

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

/** The lines a mode shows. */
export function shownLines(hunk: Hunk, mode: ViewMode): DiffLine[] {
  return hunk.lines.filter((line) => showsLine(mode, line.kind));
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * One piece of code as the highlighter read it (0.76.0): its text, its role's place in the theme's code colours
 * (`scopeRoles.json`), and Shiki's style bits: italic 1, bold 2, underline 4, struck through 8. Coloured by a set brought in from
 * a VS Code theme (0.77.0), its role is -1 and it carries its colour, `#RRGGBB`.
 */
export type Piece = [
  text: string,
  role: number,
  style: number,
  colour?: string,
];

const SOLID = /^#[0-9A-F]{6}$/;

const STYLES: [number, string][] = [
  [1, "tok-italic"],
  [2, "tok-bold"],
  [4, "tok-underline"],
  [8, "tok-strikethrough"],
];

/**
 * Pieces of code as one piece of HTML per line: each run of text escaped, and wrapped in a span naming its role and style unless
 * it is plain; a piece with its own colour (a set from VS Code) carries it as a style. Neighbouring pieces of the same kind share
 * one span. Nothing but escaped text, these class names and colours checked as `#RRGGBB` reaches the HTML.
 */
export function piecesToHtml(
  lines: Piece[][],
  roles: readonly string[],
): string[] {
  return lines.map((line) => {
    let html = "";
    let open = "";
    let run = "";
    const close = () => {
      if (run)
        html += open
          ? `<span ${open}>${escapeHtml(run)}</span>`
          : escapeHtml(run);
      run = "";
    };
    for (const [text, role, style, colour] of line) {
      const classes = [
        ...(roles[role] && roles[role] !== "plain"
          ? [`tok-${roles[role]}`]
          : []),
        ...STYLES.filter(([bit]) => (style & bit) !== 0).map(
          ([, name]) => name,
        ),
      ].join(" ");
      const own = colour && SOLID.test(colour) ? colour : "";
      const opening = [
        classes ? `class="${classes}"` : "",
        own ? `style="color:${own}"` : "",
      ]
        .filter(Boolean)
        .join(" ");
      if (opening !== open) {
        close();
        open = opening;
      }
      run += text;
    }
    close();
    return html;
  });
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

/**
 * The changelog path a request for a whole commit names when no entry of the commit is in view. The host asks for a changelog's
 * path; with a commit named, the tools show the commit whole and read that path only for the entries it wrote, and a path the
 * repository does not have simply gives none. The repository's top changelog stands in.
 */
export const COMMIT_ONLY_CHANGELOG = "CHANGELOG.md";

/** A code viewer request for one whole commit, from anywhere that names a commit but no entry (Home, a thing's history). */
export function commitRequest(
  repository: string,
  commit: string,
  subject: string,
  changelog: string = COMMIT_ONLY_CHANGELOG,
  product = "",
): EntryRequest {
  return {
    repository,
    changelog,
    product,
    entry: { version: "", section: "", text: subject, lead: subject },
    commit,
  };
}
