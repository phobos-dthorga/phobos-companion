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
  /** For a thing a commit changed: where it stood at that commit (kit 1.112.0), to light its lines in the commit's changes. */
  at?: { file: string; line: number; end: number };
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
  | "summary"
  | "find"
  | "around"
  | "flow"
  | "changed"
  | "history"
  | "names"
  | "calls";

/** One call a method makes (kit 1.116.0): to a method of ours (`file`, `node`) or of another assembly (`assembly`). */
export type Call = {
  key: string;
  display: string;
  /** Made through `base`. */
  viaBase: boolean;
  file?: string;
  line?: number;
  node?: string | null;
  assembly?: string | null;
};

/** Calls that moved whole between two of the commit's methods. */
export type Moved = { key: string; display: string; calls: string[] };

/** A method whose calls the commit changed, or one it added or removed. */
export type CallsMethod = {
  key: string;
  id: string | null;
  node: string | null;
  display: string;
  file: string;
  line: number;
  end: number;
  status: "changed" | "added" | "removed";
  gone: Call[];
  new: Call[];
  kept: Call[];
  movedTo?: Moved[];
  movedFrom?: Moved[];
};

/** One step of a ring of calls; `outside` for a game method. The last step calls the first. */
export type RingStep = { key: string; display: string; outside: boolean };

/** What a commit did to its C# methods' calls, and the rings of calls it made or cut (kit 1.116.0's `connections calls`). */
export type Calls = {
  commit: { hash: string; subject: string };
  files: { before: string | null; after: string | null }[];
  methods: CallsMethod[];
  rings: { made: RingStep[][]; cut: RingStep[][]; standing: RingStep[][] };
  game: string | null;
  /** The game's assemblies read for the game's side of a ring. */
  gameRead: string[];
  seconds: number;
  limits: string[];
};

/** Where a name is declared (kit 1.111.0): a file and lines of this repository, or another assembly. */
export type Declared = {
  file?: string;
  line?: number;
  end?: number;
  assembly?: string;
};

/** One of the things a name read by name may stand for (kit 1.115.0). */
export type Candidate = {
  id: string;
  name: string;
  kind: string;
  file: string;
  line: number;
  end: number;
};

/** What a C# name also stands for in the game's data, as a rule read its declaration (kit 1.117.0): a DefOf field's Def. */
export type Also = {
  rule: string;
  ruleWords: string;
  candidates: Candidate[];
  more: number;
};

/**
 * One name in a file: in C# as the kit's names reader read it with Roslyn; in Lua, Python and XML by name from the connections
 * (kit 1.115.0, `exact` false, with the things it may stand for); and, where the game has a table of them, a name that crosses
 * between its data files and its code, read by a rule (kit 1.117.0). `line` counts from 1, `column` from 0.
 */
export type CodeName = {
  line: number;
  column: number;
  length: number;
  text: string;
  kind: string;
  display: string;
  id?: string | null;
  /** Whether this is the name's own declaration. */
  here: boolean;
  declared: Declared;
  /** By name: the first thing's connections id, the things it may stand for, and how many more there are. */
  node?: string;
  exact?: boolean;
  candidates?: Candidate[];
  more?: number;
  /** Read by one of the game's rules for names between data files and code: which, and what it reads, in words. */
  rule?: string | null;
  ruleWords?: string | null;
  /** No thing of this repository has the name: the game's own, another mod's, or a mistake. `declared` is then empty. */
  outside?: boolean;
  /** The name to look for in another author's code: a class a data file names that is not this repository's. */
  their?: string | null;
  also?: Also;
};

/** A declaration of this repository's, with its lines, its comment above it included; `cut` when there are more. */
export type Snippet = {
  file: string;
  start: number;
  end: number;
  lines: string[];
  cut: boolean;
};

/** Every name in one file (kit 1.111.0's `connections names`; Lua, Python and XML by name from 1.115.0, `exact` false). */
export type Names = {
  file: string;
  project: string | null;
  projects: string[];
  exact?: boolean;
  names: CodeName[];
  /** Declarations of this repository the file names, by "file:line". */
  snippets: Record<string, Snippet>;
  errors: number;
  missingReferences: number;
  seconds: number;
  commit: string | null;
  limits: string[];
  /** The game whose rules read the names between data files and code, when it has a table of them (kit 1.117.0). */
  game?: string;
};

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
