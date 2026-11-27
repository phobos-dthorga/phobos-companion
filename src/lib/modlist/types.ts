/** How much a finding matters (phobos-modkit 1.72.0, `mod-list check`): a problem, a warning or a note. */
export type Severity = "problem" | "warning" | "note";

/** A change the check offers, which the page may make after the owner's yes. */
export type ModFix = {
  action: "remove" | "remove-extra" | "enable";
  list_key: string;
  id: string;
  label: string;
};

/** One finding about one list. `kind` is missing, twice, needs, clash, order, removed, unsubscribed, version or unchecked. */
export type ModProblem = {
  kind: string;
  severity: Severity;
  list_key: string;
  id: string;
  name: string;
  title: string;
  why: string;
  clue: string;
  needed_by: string[];
  fixes: ModFix[];
  workshop_id: string;
};

/** One list of active mods the game reads. */
export type ModListInfo = {
  key: string;
  label: string;
  path: string;
  count: number;
  writable: boolean;
};

/** One backup of a list, kept before a change. `at` is the kit's UTC stamp, 20261122T042900Z. */
export type ModBackup = {
  list: string;
  why: string;
  at: string;
  file: string;
  undone?: boolean;
};

/** A game's check. `supported` false: the tools cannot read this game's list yet, and `notes` says so. */
export type ModListCheck = {
  game: string;
  name: string;
  supported: boolean;
  version: string;
  online: boolean;
  notes: string[];
  installed: number;
  running: string[];
  lists: ModListInfo[];
  problems: ModProblem[];
  counts: Record<Severity, number>;
  backups: ModBackup[];
  /** What the first game run after the last change showed, by list (phobos-modkit 1.85.0). */
  since?: Record<string, Since>;
};

/** A verdict on the last change (phobos-modkit 1.85.0, `mod-list since`). */
export type SinceVerdict =
  | "clean"
  | "new-errors"
  | "not-run-since"
  | "too-late"
  | "running"
  | "no-change"
  | "unknown"
  | "changed-since";

/** An error signature new since the change, and the mods the log's clues point at. */
export type NewError = {
  id: string;
  level: string;
  count: number;
  message: string;
  mods: string[];
};

/** What the first game run after the last change made here showed. */
export type Since = {
  verdict: SinceVerdict;
  change?: { why: string; at: string; file: string };
  new?: NewError[];
  new_errors?: number;
  run?: string;
};

/** What a change or an undo did, or why the kit refused it. */
export type ModListChange = {
  ok: boolean;
  title: string;
  refusal: string | null;
  data: { change?: string; undoes?: string; backup?: string };
};

/** One mod on this PC, as Edit the list shows it (phobos-modkit 1.73.0, `mod-list mods`). `key` is how the game compares ids. */
export type ModRow = {
  key: string;
  id: string;
  name: string;
  source: "game" | "local" | "workshop";
  workshop_id: string;
  authors: string;
  versions: string[];
  needs: string[];
  /** Its own picture on this PC (phobos-modkit 1.82.0); null when it has none. */
  preview?: string | null;
  /** Where it is, and what its own files say of other mods (phobos-modkit 1.142.0), for the info panel and the draft's marks. */
  folder?: string;
  load_after?: string[];
  load_before?: string[];
  incompatible?: string[];
  /** Each need's ids, any one of which meets it. */
  need_ids?: string[][];
};

/** One entry of a list, in order. `remembered` is the name a check once saw, for a mod no longer here. */
export type ListEntry = { id: string; key: string; remembered: string };

export type EditableList = {
  key: string;
  label: string;
  writable: boolean;
  count: number;
  entries: ListEntry[];
};

/** Every mod on this PC and each list in order; `changes` says how many changes each list can still go back on. */
export type ModsListing = {
  game: string;
  name: string;
  supported: boolean;
  version: string;
  mods: ModRow[];
  lists: EditableList[];
  running: string[];
  notes: string[];
  changes: Record<string, number>;
};

/** What a change or an undo from Edit the list answers with: the list as it now stands. */
export type EditAnswer = ModListChange & {
  data: { ids?: string[]; keys?: string[] };
};

/** Where a load-order rule comes from (phobos-modkit 1.74.0): yours, the mod's own files, what it needs, the community's, the game. */
export type RuleSource =
  "yours" | "code" | "own" | "needs" | "workshop" | "community" | "game";

/** One mod a sort moves: from and to (1 is first), and why, with whose rules. */
export type SortMove = {
  key: string;
  name: string;
  from: number;
  to: number;
  why: string[];
  sources: RuleSource[];
  /** What kind of move (phobos-modkit 1.86.0): a rule asks for it, its group places it, names put in order, or room made. */
  kind?: "rule" | "group" | "order" | "room";
};

/** A rule a sort set aside because it closed a loop of rules. */
export type SetAside = {
  rule: string;
  source: RuleSource;
  loop: string;
  why: string;
};

/** A rule set the sorter reads, and where it is. */
export type RuleSetInfo = {
  source: RuleSource;
  label: string;
  where: string;
  editable: boolean;
  count: number;
};

/** A sort, previewed or written (`mod-list sort`): the new order, every move and why. */
export type SortAnswer = ModListChange & {
  data: {
    how?: "fewest" | "full";
    ids?: string[];
    keys?: string[];
    moves?: SortMove[];
    set_aside?: SetAside[];
    rules?: Record<
      "yours" | "code" | "own" | "needs" | "workshop" | "community",
      number
    >;
    placings?: { top: number; bottom: number };
    count?: number;
    applied?: boolean;
    sets?: RuleSetInfo[];
  };
};

/** Where one of the owner's rules says a mod loads. */
export type RuleKind = "after" | "before" | "top" | "bottom";

/** One of the owner's rules; `number` is how Take away names it. */
export type OwnRule = {
  mod: string;
  kind: RuleKind;
  other: string;
  added?: string;
  number?: number;
  note?: string;
  words: string;
};

/** The owner's rules (kept by the tools, and RimSort's, read only) and every rule set the sorter reads. */
export type RulesListing = {
  rules: OwnRule[];
  theirs: OwnRule[];
  sets: RuleSetInfo[];
  /** The mod manager's own copy of the owner's rules (0.112.0, kit 1.144.0): how many, and whether they were brought over. */
  manager?: {
    name: string;
    count: number;
    where: string;
    broughtOver: boolean;
  };
};

/** One Workshop item Steam has not brought up to date (0.114.0, kit 1.147.0). */
export type WorkshopUpdate = {
  workshop_id: string;
  state: "waiting" | "downloading" | "missing";
  id: string;
  name: string;
  words: string;
  installed_at: number;
  newest_at: number;
  downloaded: number;
  to_download: number;
};

/** The Workshop items Steam has not brought up to date, and whether the game runs (Steam holds its updates meanwhile). */
export type WorkshopUpdates = {
  record: boolean;
  items: WorkshopUpdate[];
  needsUpdate: boolean;
  needsDownload: boolean;
  gameRunning: boolean;
};

/** One community list the sorter and the check read (0.112.0, kit 1.144.0): whose copy is read and how old it is. */
export type CommunityList = {
  name: string;
  label: string;
  repo: string;
  licence: string;
  ours: string;
  theirs: string;
  read: "" | "ours" | "theirs";
  age_days: number | null;
  stale: boolean;
  fetched: string;
};

/** What one fetch of a community list did. */
export type CommunityFetch = {
  name: string;
  label: string;
  fetched: number;
  unchanged: number;
  missing: string[];
  error: string;
};

/** The community lists, and what a fetch did (empty when nothing was fetched). */
export type CommunityLists = {
  databases: CommunityList[];
  fetched: CommunityFetch[];
  manager: string;
  freshDays: number;
};

/** Where a saved list comes from (phobos-modkit 1.76.0): saved by name, kept at a game start, a save's own, RimSort's history. */
export type ListSource = "saved" | "kept" | "save" | "manager";

/** One saved list on offer; `ref` names it again (with its source). */
export type ListInfo = {
  source: ListSource;
  ref: string;
  label: string;
  when: string;
  count: number;
  version: string;
  note: string;
  /** A list kept at a game start: what that run showed (phobos-modkit 1.85.0); clean is null when it could not be compared. */
  ran?: { started?: string; clean?: boolean | null; new_errors?: number };
};

/** Every saved list on offer, by source; `files` says whether list files can be opened and written for this game. */
export type ListsListing = {
  sources: Record<ListSource, ListInfo[]>;
  files: boolean;
  suffix: string;
};

/** A mod named in a comparison. */
export type NamedMod = { key: string; name: string };

/** A mod a list names that is not on this PC: left out, with why it is gone. */
export type MissingMod = {
  id: string;
  key: string;
  name: string;
  workshop_id: string;
  why: string;
};

/** What loading a list would change (`compare`), or did (`load`). */
export type CompareAnswer = ModListChange & {
  data: {
    label?: string;
    when?: string;
    same?: boolean;
    on?: NamedMod[];
    off?: NamedMod[];
    moved?: number;
    missing?: MissingMod[];
    count?: number;
    now?: number;
    applied?: boolean;
    backup?: string;
  };
};

/** One Workshop item a subscribe asked Steam for (phobos-modkit 1.77.0), and what Steam then said. */
export type Subscribed = {
  workshop_id: string;
  subscribed: boolean;
  installed: boolean;
  state: string;
  id: string;
  name: string;
};

/** What subscribing did. */
export type SubscribeAnswer = ModListChange & {
  data: { items?: string[]; applied?: boolean; results?: Subscribed[] };
};

/** What unsubscribing did: the mods switched off first, and each item Steam let go of. */
export type UnsubscribeAnswer = ModListChange & {
  data: {
    switched_off?: string[];
    backup?: string;
    ids?: string[];
    keys?: string[];
    results?: { workshop_id: string; unsubscribed: boolean; name: string }[];
  };
};
