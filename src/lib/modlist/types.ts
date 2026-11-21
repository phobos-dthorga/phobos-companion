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
