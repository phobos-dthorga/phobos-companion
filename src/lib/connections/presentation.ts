import type { Relation, Thing } from "./types";

/** Every relation, in the order its group is listed and drawn: what the thing does first, then what is done to it. */
export const RELATIONS: Relation[] = [
  "calls",
  "called-by",
  "belongs-to",
  "holds",
  "builds-on",
  "built-on-by",
  "overrides",
  "overridden-by",
  "patches",
  "patched-by",
  "uses",
  "used-by",
  "imports",
  "imported-by",
];

/** Each relation's colour, by the theme's role. A colour always comes with words: the hub's name and count. */
export const RELATION_TONES: Record<
  Relation,
  "observed" | "comparison" | "success" | "risk" | "accent" | "muted"
> = {
  calls: "observed",
  "called-by": "observed",
  holds: "comparison",
  "belongs-to": "comparison",
  "builds-on": "success",
  "built-on-by": "success",
  overrides: "success",
  "overridden-by": "success",
  patches: "risk",
  "patched-by": "risk",
  uses: "accent",
  "used-by": "accent",
  imports: "muted",
  "imported-by": "muted",
};

/** The words for each relation, with the key written out so the catalogue check can find it. */
export const RELATION_KEYS: Record<Relation, string> = {
  calls: "connections-relation-calls",
  "called-by": "connections-relation-called-by",
  holds: "connections-relation-holds",
  "belongs-to": "connections-relation-belongs-to",
  "builds-on": "connections-relation-builds-on",
  "built-on-by": "connections-relation-built-on-by",
  overrides: "connections-relation-overrides",
  "overridden-by": "connections-relation-overridden-by",
  patches: "connections-relation-patches",
  "patched-by": "connections-relation-patched-by",
  uses: "connections-relation-uses",
  "used-by": "connections-relation-used-by",
  imports: "connections-relation-imports",
  "imported-by": "connections-relation-imported-by",
};

/** The relations drawn at first: the ones that say most about how code fits together. Holding a type's every member is a list. */
export const FIRST_SHOWN: Relation[] = RELATIONS.filter((r) => r !== "holds");

/** A thing's kind as one letter in its circle. Its kind is also in its label and its details, never the letter alone. */
export function kindMark(thing: Thing): string {
  switch (thing.kind) {
    case "method":
      return "M";
    case "constructor":
      return "N";
    case "property":
      return "P";
    case "field":
      return "F";
    case "event":
      return "E";
    case "interface":
      return "I";
    case "struct":
      return "S";
    case "enum":
      return "#";
    case "function":
      return "ƒ";
    case "module":
      return "▣";
    case "def":
      return "D";
    case "abstract def":
      return "A";
    case "translation key":
      return "K";
    case "data object":
      return "O";
    default:
      return "C";
  }
}

/** A short label for the picture: the last part of the name, cut to fit under a circle. */
export function shortLabel(thing: Thing, width = 18): string {
  const name = thing.name;
  return name.length > width ? `${name.slice(0, width - 1)}…` : name;
}

/** Where a thing is: its file and line, or the assembly it comes from, or nothing known. */
export function whereWords(thing: Thing): string {
  if (thing.file)
    return thing.line ? `${thing.file}:${thing.line}` : thing.file;
  return thing.assembly ?? "";
}

/** The things a commit changed that are still in the code, most-changed first; the first is the one to start from. */
export function startingPoints(things: Thing[]): Thing[] {
  return things
    .filter((t) => t.inGraph !== false)
    .sort((a, b) => (b.linesChanged ?? 0) - (a.linesChanged ?? 0));
}
