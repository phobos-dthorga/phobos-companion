import type { Report } from "../reports/types";
import type { Failed, Waiting } from "../shell/types";

/** Whether this game's tools can look inside the running game, and why not when the manifest has changed. */
export type Offer = {
  available: boolean;
  refusal: string | null;
  /** 0.102.0: the tools can also run the checks with the game frozen, for when a snapshot has no room. */
  frozen_checks: boolean;
  /** 0.103.0: the tools can also read the overview and one kind with the game frozen. */
  frozen_browse: boolean;
};

/** The reader's first line once a snapshot is taken (phobos-modkit 1.65.1, `look-serve`). */
export type Ready = {
  ready: true;
  pid: number;
  /** How long the game paused while the snapshot was taken. */
  snapshotMs: number;
  /** How old the snapshot was when the reader said it was ready. */
  ageSeconds: number;
  runtime: string;
  runtimeFolder: string;
  dac: string;
  modules: number;
  threads: number;
  segments: number;
  objects: number | null;
  /** How long it may be held, in seconds. */
  limitSeconds: number;
};

/** What came of asking for a snapshot. */
export type Taken = {
  available: boolean;
  snapshot: number | null;
  ready: Ready | { ready: false; error?: string } | null;
  refusal: string | null;
  command_line: string;
};

/** Why a snapshot is no longer held: its time was up, the person let it go, the reader stopped, or it is not the one held. */
export type Released = "limit" | "asked" | "ended" | "gone";

/** One answer from the held snapshot. */
export type Answer<T = unknown> = {
  ok: boolean;
  data: T;
  error: string | null;
  released: Released | null;
};

export type TakenReading = Waiting | { state: "ready"; taken: Taken };
/** What came of running the checks with the game frozen (0.102.0): one run, nothing held afterwards. */
export type FrozenChecks = {
  available: boolean;
  answer: ChecksAnswer | null;
  refusal: string | null;
  command_line: string;
};
export type FrozenReading = Waiting | { state: "ready"; frozen: FrozenChecks };
export type OfferReading = Waiting | { state: "ready"; offer: Offer };
export type AnswerReading<T = unknown> =
  Waiting | { state: "ready"; answer: Answer<T> };
export type ReleaseReading = Failed | { state: "ready"; held: boolean };

/** Who a kind's memory belongs to: a mod, the game, .NET itself, or no one the tools could name. */
export type OwnerKind = "mod" | "game" | "runtime" | "unknown";

export type Owner = {
  name: string;
  kind: OwnerKind;
  bytes: number;
  count: number;
};

/** One kind (a .NET type) in the overview, with who it belongs to; `through` names the type that decided it, for a collection. */
export type KindRow = {
  type: string;
  module: string;
  bytes: number;
  count: number;
  owner: string;
  ownerKind: OwnerKind;
  through: string;
};

export type Overview = {
  totalObjects: number;
  totalBytes: number;
  freeBytes: number;
  untyped: number;
  seconds: number;
  owners: Owner[];
  types: KindRow[];
  typeCount: number;
  /** The folder the overview was kept under, for comparing later. */
  kept: string;
  notes: string[];
};

export type KindItem = { address: string; size: number; summary: string };

/** A page of one kind's objects. `count` is every object of the kind, whatever the filter. */
export type KindPage = {
  type: string;
  count: number;
  totalBytes: number;
  skip: number;
  take: number;
  more: boolean;
  match: string;
  items: KindItem[];
};

export type FieldKind =
  "value" | "text" | "link" | "null" | "struct" | "unreadable";

/** One value an object holds. A `link` is another object, to open with a press. */
export type Field = {
  name: string;
  type: string;
  kind: FieldKind;
  value?: string;
  address?: string;
  valueType?: string;
  summary?: string;
  fields?: Field[];
};

export type Items = {
  kind: "list" | "dictionary" | "set";
  count: number;
  skip: number;
  items: Field[];
};

/** One object in full. */
export type ObjectData = {
  address: string;
  type: string;
  module: string;
  size: number;
  summary: string;
  /** The static field holding it directly, when one does. */
  static: string | null;
  kind: "text" | "array" | "object";
  text?: string;
  length?: number;
  elements?: Field[];
  skip?: number;
  fields?: Field[];
  items?: Items;
};

/** An object on a path or among the holders; `field` is how the one before it holds it. */
export type Link = {
  address: string;
  type: string;
  module: string;
  size: number;
  summary: string;
  field?: string;
};

export type Holders = {
  address: string;
  holders: Link[];
  more: boolean;
  /** The kinds of root it is itself, if any (a thread's stack, a handle). */
  roots: string[];
  static: string | null;
};

/** One path from a root down to an object, root first. */
export type Path = {
  root: string;
  static: string | null;
  pinned: boolean;
  links: Link[];
  skipped: number;
};

export type PathAnswer = {
  address: string;
  type: string;
  path: Path | null;
  /** Nothing holds it: garbage not yet collected, not a leak. */
  unreachable: boolean;
  timedOut: boolean;
};

export type WhyAnswer = {
  type: string;
  count: number;
  totalBytes: number;
  checked: number;
  paths: Path[];
  noneReachable: boolean;
  timedOut: boolean;
};

/** A request the page sends; the host checks every one again. */
export type Request =
  | { op: "overview" }
  | { op: "info" }
  | {
      op: "kind";
      type: string;
      skip: number;
      take: number;
      sort: "" | "size";
      match: string;
    }
  | { op: "object"; address: string; skip: number; take: number }
  | { op: "holders"; address: string; max: number }
  | { op: "path"; address: string }
  | { op: "why"; type: string; sample: number }
  | { op: "checks" };

/** One live check's outcome, as the tools give it (phobos-modkit 1.123.0, `look-serve`'s checks). */
export type CheckOutcome = {
  id: string;
  title: string;
  level: "fault" | "look";
  row: string;
  read: number;
  problem: string;
  findings: { id: string; label: string; text: string }[];
};

/** The answer to `{ op: "checks" }`: every live check in the game's check files, asked of the snapshot held. */
export type ChecksAnswer = {
  checks: CheckOutcome[];
  faults: number;
  looks: number;
  report: Report;
};
