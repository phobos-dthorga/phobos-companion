import type { Entry, ModState, Move } from "./types";

/** What a mod's state says on its card: words and a mark, so colour never carries it alone. */
export const STATE_WORDS: Record<ModState, { label: string; mark: string }> = {
  "not-installed": { label: "mods-state-not-installed", mark: "○" },
  "up-to-date": { label: "mods-state-up-to-date", mark: "✓" },
  behind: { label: "mods-state-behind", mark: "↑" },
  ahead: { label: "mods-state-ahead", mark: "↓" },
  differs: { label: "mods-state-differs", mark: "⇅" },
};

/** Each move's button, its confirmation, the line while it works, and the line once it is done. */
export const MOVE_WORDS: Record<
  Move,
  { button: string; confirm: string; working: string; yes: string }
> = {
  backup: {
    button: "mods-action-backup",
    confirm: "mods-confirm-backup",
    working: "mods-working-backup",
    yes: "mods-yes-backup",
  },
  restore: {
    button: "mods-action-restore",
    confirm: "mods-confirm-restore",
    working: "mods-working-restore",
    yes: "mods-yes-restore",
  },
  install: {
    button: "mods-action-install",
    confirm: "mods-confirm-install",
    working: "mods-working-install",
    yes: "mods-yes-install",
  },
};

/** Why a move can't be made now, as a message key, or null when it can. A backup only reads, so it may run beside the game. */
export function blockedBy(move: Move, gameRunning: string[]): string | null {
  return move !== "backup" && gameRunning.length > 0
    ? "mods-blocked-running"
    : null;
}

export type VersionGroup = {
  version: string;
  summary: string;
  entries: Entry[];
};

/** Entries grouped under their versions, in the order the changelog gives them. */
export function groupByVersion(
  entries: Entry[],
  summaries: Record<string, string>,
): VersionGroup[] {
  const groups: VersionGroup[] = [];
  for (const entry of entries) {
    let group = groups.find((g) => g.version === entry.version);
    if (!group) {
      group = {
        version: entry.version,
        summary: summaries[entry.version] ?? "",
        entries: [],
      };
      groups.push(group);
    }
    group.entries.push(entry);
  }
  return groups;
}

/** An entry split into its bold opening and the rest; an entry with no bold opening is all rest. */
export function entryParts(entry: Entry): { lead: string; rest: string } {
  const opening = `**${entry.lead}**`;
  return entry.text.startsWith(opening)
    ? { lead: entry.lead, rest: entry.text.slice(opening.length).trim() }
    : { lead: "", rest: entry.text };
}

/** "8 MB", "1.2 GB"; empty when unknown. */
export function formatSize(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  const mb = bytes / 1024 ** 2;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(mb)).toLocaleString("en-AU")} MB`;
}

/** "18 Nov 2026, 8:07 pm" from an ISO time; the text itself when it isn't one. */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const moment = new Date(iso);
  if (Number.isNaN(moment.getTime())) return iso;
  return moment.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A commit's first eight characters. */
export function shortCommit(commit: string | null | undefined): string {
  return (commit ?? "").slice(0, 8);
}

/** How many entries a list shows before "Show all". */
export const FIRST_ENTRIES = 8;
