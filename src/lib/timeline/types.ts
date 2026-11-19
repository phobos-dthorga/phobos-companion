import type { Failure, Waiting, Pending } from "../shell/types";

/** What a fact says happened (phobos-modkit `history`, kit 1.30.0). */
export type FactKind =
  | "product-started"
  | "version-written"
  | "entries-added"
  | "entries-reworded"
  | "entries-removed"
  | "version-removed"
  | "version-released"
  | "product-renamed"
  | "product-ended"
  | "installed"
  | "went-back"
  | "backed-up"
  | "built"
  | "encoded"
  | "setting-added"
  | "setting-removed"
  | "setting-default"
  | "duplicates-removed";

/** An entry a fact names: its opening words and section; a reworded one with its words before and after. */
export type FactEntry = {
  lead: string;
  section: string;
  was?: string;
  now?: string;
};

/** One thing that happened: from git (what a repository did) or from this PC's history log (what was done here). */
export type Fact = {
  kind: FactKind;
  /** An ISO time, in UTC. */
  time: string;
  source: "git" | "log";
  product?: string;
  mod?: string;
  repository?: string;
  commit?: string | null;
  subject?: string;
  changelog?: string;
  version?: string;
  count?: number;
  entries?: FactEntry[];
  summary?: string;
  heading?: string;
  /** For an ended product: the product whose changelog took in its history. */
  mergedInto?: string | null;
  /** For a renamed product: its names before and after. */
  was?: string;
  now?: string;
  backup?: string;
  fromVersion?: string;
  ok?: boolean;
  mods?: string[];
  /** For a setting (kit 1.40.0): its saved key, the settings window's label where known, and its default before and after. */
  key?: string;
  label?: string | null;
  before?: string | null;
  after?: string | null;
  /** For repeated backups removed: how much room it freed. */
  size?: number;
};

export type Timeline = {
  repositories: string[];
  facts: Fact[];
  log_exists: boolean;
};

export type TimelineReading = Waiting | { state: "ready"; timeline: Timeline };

/** Which changelog to read as it stood, and at which commit or moment. */
export type StoodRequest = {
  repository: string;
  changelog: string;
  product: string;
  commit: string | null;
  when: string | null;
};

export type StoodEntry = {
  section: string;
  text: string;
  lead: string;
  /** What happened to it since: kept, reworded (with its words now) or removed. */
  since: "kept" | "reworded" | "removed";
  now: string | null;
  /** The commit that wrote it, as the changelog stood then: its first 12 characters, or null (kit 1.31.0). */
  commit?: string | null;
};

export type StoodVersion = {
  version: string;
  heading: string;
  summary: string;
  entries: StoodEntry[];
};

export type Stood = {
  product: string;
  changelog: string;
  commit: { hash: string; time: string; author: string; subject: string };
  stillThere: boolean;
  versions: StoodVersion[];
  since: { added: number; reworded: number; removed: number };
};

export type AsItStood = {
  found: boolean;
  refusal: string | null;
  stood: Stood;
};

export type StoodReading = Pending | { state: "ready"; found: AsItStood };
