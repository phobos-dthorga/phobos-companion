import type { CodeName, Names } from "../connections/types";

/**
 * Names to follow in C# code (0.79.0; docs/code-reading.md step 4): the kit's names reader says what every name in a file is and
 * where it is declared, and these turn that into marks in the coloured lines and moves between them. Tested without a screen.
 */

/** A name's place in one line of text: from `start` up to `end`, and its place in the reading's list. */
export type NameRange = { start: number; end: number; index: number };

/** The names on each line as the file now stands, by line number, in the order they appear. */
export function namesByLine(names: Names): Map<number, NameRange[]> {
  const found = new Map<number, NameRange[]>();
  names.names.forEach((name, index) => {
    const line = found.get(name.line) ?? [];
    line.push({ start: name.column, end: name.column + name.length, index });
    found.set(name.line, line);
  });
  for (const ranges of found.values()) ranges.sort((a, b) => a.start - b.start);
  return found;
}

/**
 * A line's coloured HTML with each name wrapped in a mark the viewer can find and press (`<span class="nm" data-name="7">`), counted
 * by the line's text: an entity (`&lt;`) is one character, and a tag none. A name that runs across a colour's edge is closed before
 * the edge and opened again after it, so every span still closes where it opened. `classes` adds to a name's mark (the one chosen,
 * its other uses).
 */
export function wrapNames(
  html: string,
  ranges: NameRange[],
  classes: (index: number) => string = () => "",
): string {
  if (ranges.length === 0) return html;
  const open = (range: NameRange) => {
    const extra = classes(range.index);
    return `<span class="nm${extra ? ` ${extra}` : ""}" data-name="${range.index}">`;
  };
  let out = "";
  let at = 0;
  let next = 0;
  let inside: NameRange | null = null;
  for (let i = 0; i < html.length;) {
    if (html[i] === "<") {
      const close = html.indexOf(">", i);
      const tag = html.slice(i, close + 1);
      out += inside ? `</span>${tag}${open(inside)}` : tag;
      i = close + 1;
      continue;
    }
    if (!inside && next < ranges.length && ranges[next].start === at) {
      inside = ranges[next++];
      out += open(inside);
    }
    const entity = html[i] === "&" ? html.indexOf(";", i) : -1;
    const step = entity > i ? entity - i + 1 : 1;
    out += html.slice(i, i + step);
    i += step;
    at++;
    if (inside && at === inside.end) {
      out += "</span>";
      inside = null;
    }
  }
  if (inside) out += "</span>";
  // A mark opened and closed again around a tag with no text between leaves an empty span: harmless, but taken out.
  return out.replace(/<span class="nm[^"]*" data-name="\d+"><\/span>/g, "");
}

/**
 * The connections id of a name's declaration (`cs:Phobos.Boat.Float`), from Roslyn's documentation id
 * (`M:Phobos.Boat.Float(System.Int32)`), for How it connects; null for a name with none (a parameter, a local).
 */
export function nodeIdOf(name: CodeName): string | null {
  // A name read by name (Lua, Python, XML) carries its thing's connections id already.
  if (name.node) return name.node;
  const id = name.id;
  if (!id || !/^[TMPFE]:/.test(id)) return null;
  let full = id
    .slice(2)
    .replace(/\(.*$/, "")
    .replace(/``\d+$/, "");
  if (full.endsWith(".#ctor") || full.endsWith(".#cctor")) {
    const type = full.slice(0, full.lastIndexOf("."));
    full = `${type}.${type.slice(type.lastIndexOf(".") + 1)}`;
  }
  return `cs:${full}`;
}

/** Two names stand for the same declaration: the same file and line in this repository, or the same id elsewhere. */
export function sameDeclaration(a: CodeName, b: CodeName): boolean {
  if (a.declared.file && b.declared.file)
    return (
      a.declared.file === b.declared.file && a.declared.line === b.declared.line
    );
  return !!a.id && a.id === b.id;
}

/**
 * A name read by name, taken as one of the things it may stand for (0.81.0): that thing's kind, name, place and id. A name with no
 * such choice, or a place out of range, is given back as it is.
 */
export function asCandidate(name: CodeName, index: number): CodeName {
  const thing = name.candidates?.[index];
  if (!thing) return name;
  return {
    ...name,
    kind: thing.kind,
    display: thing.name,
    node: thing.id,
    declared: { file: thing.file, line: thing.line, end: thing.end },
  };
}

/** The language a file's lines are coloured in, by its suffix, for a declaration's lines shown on a card. */
export function languageOf(file: string): string {
  const suffix = file.slice(file.lastIndexOf(".") + 1).toLowerCase();
  return (
    { cs: "csharp", lua: "lua", py: "python", xml: "xml" }[suffix] ?? "plain"
  );
}

/** Whether a name lives only inside a member (a parameter, a local): nothing to connect, and no lines kept for it. */
export function inside(name: CodeName): boolean {
  return ["parameter", "local", "type parameter"].includes(name.kind);
}

/**
 * The name a key moves to from `from` among the names shown, each with its line and place: along the line (`next`, `previous`), or
 * to the nearest name on the line above or below (`up`, `down`). The first shown when none is chosen; null at an end.
 */
export function step(
  shown: { index: number; row: number; column: number }[],
  from: number | null,
  move: "next" | "previous" | "up" | "down",
): number | null {
  if (shown.length === 0) return null;
  const at = shown.findIndex((s) => s.index === from);
  if (at < 0) return shown[0].index;
  if (move === "next") return shown[at + 1]?.index ?? null;
  if (move === "previous") return at > 0 ? shown[at - 1].index : null;
  const here = shown[at];
  const rows = shown.filter((s) =>
    move === "down" ? s.row > here.row : s.row < here.row,
  );
  if (rows.length === 0) return null;
  const row = move === "down" ? rows[0].row : rows[rows.length - 1].row;
  return rows
    .filter((s) => s.row === row)
    .reduce((best, s) =>
      Math.abs(s.column - here.column) < Math.abs(best.column - here.column)
        ? s
        : best,
    ).index;
}
