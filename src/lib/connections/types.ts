import type { Failure, Pending } from "../shell/types";

/** How one thing relates to the thing in the middle (phobos-modkit `connections`, kit 1.33.0). */
export type Relation =
  | "calls"
  | "called-by"
  | "holds"
  | "belongs-to"
  | "builds-on"
  | "built-on-by"
  | "overrides"
  | "overridden-by"
  | "patches"
  | "patched-by"
  | "uses"
  | "used-by"
  | "imports"
  | "imported-by";

/** A type, a method, a field, a Def, a function or a module, in any language the tools read. */
export type Thing = {
  id: string;
  name: string;
  kind: string;
  language: "csharp" | "xml" | "lua" | "python" | string;
  file: string | null;
  line: number | null;
  end: number | null;
  owner: string | null;
  /** Not this repository's: the game's, another mod's or a library's. */
  external: boolean;
  assembly: string | null;
  /** Whether its connection to the thing in the middle is exact (false: read by name). */
  exact?: boolean;
  /** How many connections it has itself. */
  connections?: number;
  /** For a thing a commit changed: how many of its lines. */
  linesChanged?: number;
  inGraph?: boolean;
};

export type Group = {
  relation: Relation;
  kind: string;
  outward: boolean;
  count: number;
  exact: boolean;
  nodes: Thing[];
};

export type Around = { centre: Thing; groups: Group[] };

export type FlowColumn = { step: number; nodes: Thing[] };

export type Flow = {
  centre: string;
  columns: FlowColumn[];
  edges: { source: string; target: string; exact: boolean }[];
};

export type Changed = {
  commit: { hash: string; subject: string };
  things: Thing[];
  files: { file: string; lines: number; placed: number }[];
};

export type Reader = {
  language: string;
  how: string;
  nodes: number;
  edges: number;
};

export type Summary = { readers: Reader[]; seconds: number };

export type Found = { things: Thing[] };

/** The kit's answer to one question: its data, or why it refused. */
export type Answer<T> = {
  ok: boolean;
  refusal: string | null;
  data: T & { repository?: string };
};

export type Asked<T> =
  | Pending
  | { state: "ready"; answer: Answer<T> }
  | { state: "failed"; failure: Failure };

export type Question =
  "summary" | "find" | "around" | "flow" | "changed" | "history";

/** A thing's own history (kit 1.34.0): the commits that changed its lines, each with the changelog entries it wrote. */
export type History = {
  file: string;
  lines: [number, number];
  more: boolean;
  commits: {
    hash: string;
    time: string;
    subject: string;
    entries: { changelog: string; product: string; text: string }[];
  }[];
};

export type Layout = "radial" | "flow" | "list";
