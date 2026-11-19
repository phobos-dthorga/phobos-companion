import type { Failure, Pending } from "../shell/types";

/** What kind of file it is (kit 1.39.0 `makeup`), in the order the pictures colour them. */
export type Kind =
  | "code"
  | "tests"
  | "data"
  | "words"
  | "pictures"
  | "sounds"
  | "build"
  | "other";

/** One committed file. */
export type MadeFile = {
  path: string;
  /** The product it belongs to, or null outside any product. */
  product: string | null;
  /** Outside any product: its top folder, "" for the repository's own top-level files. */
  group: string | null;
  kind: Kind;
  language: string;
  bytes: number;
  lines: number;
};

export type MadeNow = {
  repository: string;
  commit: string;
  kinds: Kind[];
  products: string[];
  files: MadeFile[];
};

/** A total: [lines, bytes]. */
export type Total = [number, number];

export type GrowthPoint = {
  day: string;
  commit: string;
  kinds: Partial<Record<Kind, Total>>;
  products: Record<string, Total>;
};

export type Growth = {
  repository: string;
  kinds: Kind[];
  points: GrowthPoint[];
};

export type Churned = {
  path: string;
  kind: Kind;
  commits: number;
  added: number;
  removed: number;
  last: string;
};

export type Churn = { repository: string; days: number; files: Churned[] };

export type Holding = {
  defs: Record<string, number>;
  pictures: number;
  sounds: number;
  keys: number;
};

export type Census = { repository: string; products: Record<string, Holding> };

/** How the pictures measure: lines of text, size on disk, or one a file. */
export type Measure = "lines" | "bytes" | "files";

export type Reading<T> =
  Pending | { state: "ready"; data: T } | { state: "failed"; failure: Failure };
