/** One change to a mod's setting, from the repository's history (kit 1.40.0 `installs settings`), newest first. */
export type SettingChange = {
  time: string | null;
  /** The commit that made it; null for a change not committed yet. */
  commit: string | null;
  subject: string | null;
  mod: string | null;
  product: string | null;
  key: string;
  /** The settings window's label, where the repository's tools could find it. */
  label: string | null;
  what: "added" | "removed" | "default";
  before: string | null;
  after: string | null;
};

/** One repository's settings history, with the ids the owner marked as looked at. */
export type Ledger = {
  repository: string;
  settings: SettingChange[];
  seen: string[];
};

export type LedgerItem = {
  repository: string;
  change: SettingChange;
  id: string;
};

/** A setting change's id: its key, what happened and the commit (or "now" when not committed). Marks are kept by it. */
export function settingId(change: SettingChange): string {
  return `${change.key}|${change.what}|${change.commit ?? "now"}`;
}

/** Every repository's changes split into those still to look at and those looked at, newest first in each. */
export function split(ledgers: Ledger[]): {
  toLook: LedgerItem[];
  looked: LedgerItem[];
} {
  const toLook: LedgerItem[] = [];
  const looked: LedgerItem[] = [];
  for (const ledger of ledgers) {
    const seen = new Set(ledger.seen);
    for (const change of ledger.settings) {
      const id = settingId(change);
      (seen.has(id) ? looked : toLook).push({
        repository: ledger.repository,
        change,
        id,
      });
    }
  }
  const newest = (a: LedgerItem, b: LedgerItem) =>
    (b.change.time ?? "").localeCompare(a.change.time ?? "");
  return { toLook: toLook.sort(newest), looked: looked.sort(newest) };
}

/** The ids of some items, by repository, for marking them in one go. */
export function idsByRepository(items: LedgerItem[]): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const item of items) {
    const ids = found.get(item.repository) ?? [];
    ids.push(item.id);
    found.set(item.repository, ids);
  }
  return found;
}

/** Each kind of change's words, written out so the catalogue check can find them. */
export const WHAT_WORDS: Record<SettingChange["what"], string> = {
  added: "ledger-what-added",
  removed: "ledger-what-removed",
  default: "ledger-what-default",
};
