import { LOCALE } from "../i18n/runtime";
export { formatWhen } from "../shell/dates";
import type {
  Entry,
  ModInstall,
  ModState,
  Move,
  RepositoryInstalls,
  SettingChange,
  TextureMod,
  TexturesReading,
} from "./types";

/** What a mod's state says on its card: words and a mark, so colour never carries it alone. */
export const STATE_WORDS: Record<ModState, { label: string; mark: string }> = {
  "not-installed": { label: "mods-state-not-installed", mark: "○" },
  "up-to-date": { label: "mods-state-up-to-date", mark: "✓" },
  behind: { label: "mods-state-behind", mark: "↑" },
  ahead: { label: "mods-state-ahead", mark: "↓" },
  differs: { label: "mods-state-differs", mark: "⇅" },
  unlisted: { label: "mods-state-unlisted", mark: "#" },
  rebuilt: { label: "mods-state-rebuilt", mark: "⚙" },
  unlogged: { label: "mods-state-unlogged", mark: "◆" },
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
  build: {
    button: "mods-action-build",
    confirm: "mods-confirm-build",
    working: "mods-working-build",
    yes: "mods-yes-build",
  },
  dedupe: {
    button: "mods-action-dedupe",
    confirm: "mods-confirm-dedupe",
    working: "mods-working-dedupe",
    yes: "mods-yes-dedupe",
  },
};

/** How a backup repeats the one before it, in words. */
export const SAME_WORDS: Record<"identical" | "rebuilt", string> = {
  identical: "mods-same-identical",
  rebuilt: "mods-same-rebuilt",
};

/** Why a move can't be made now, as a message key, or null when it can. A backup only reads, and removing repeated backups
 * touches only the backups folder, so both may run beside the game. */
export function blockedBy(move: Move, gameRunning: string[]): string | null {
  return move !== "backup" && move !== "dedupe" && gameRunning.length > 0
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
  return `${Math.max(1, Math.round(mb)).toLocaleString(LOCALE)} MB`;
}

/** A commit's first eight characters. */
export function shortCommit(commit: string | null | undefined): string {
  return (commit ?? "").slice(0, 8);
}

/** How many entries a list shows before "Show all". */
export const FIRST_ENTRIES = 8;

/** Whether installing from the repository would change anything in an installed mod: its changelog, its files or its build. */
export function hasChanges(mod: ModInstall): boolean {
  return (
    mod.installed !== null &&
    (mod.state !== "up-to-date" ||
      (mod.files?.total ?? 0) > 0 ||
      mod.build.needsBuild)
  );
}

/**
 * Whether installing would change only the mod's docs (0.80.0): every changed file is of the kit's "docs" kind (kit 1.114.0: a
 * README, a changelog), no build waits, and the installed copy holds nothing the repository lacks. Nothing in play would change.
 */
export function docsOnly(mod: ModInstall): boolean {
  const total = mod.files?.total ?? 0;
  return (
    mod.installed !== null &&
    total > 0 &&
    (mod.files?.counts.docs ?? 0) === total &&
    !mod.build.needsBuild &&
    (mod.state === "behind" || mod.state === "unlogged")
  );
}

/** A docs-only mod's state on its card when the owner chose to show those quietly (0.80.0). */
export const DOCS_ONLY_WORDS = {
  label: "mods-state-docs-only",
  mark: "✎",
};

/** Files differ, but the changelogs hold the same entries: a change nobody has written up yet, or one still to be built. */
export function unlogged(mod: ModInstall): boolean {
  return mod.state === "unlogged";
}

/** The sources that changed under a mod's changed code files since it was installed, each named once, and how many in all. */
export function changedSources(mod: ModInstall): {
  names: string[];
  more: number;
} {
  const found = new Set<string>();
  let inAll = 0;
  for (const file of mod.files?.paths ?? []) {
    for (const source of file.sources ?? []) found.add(source);
    inAll = Math.max(inAll, file.sourcesInAll ?? 0);
  }
  const names = [...found].slice(0, 3);
  return {
    names,
    more: Math.max(0, Math.max(inAll, found.size) - names.length),
  };
}

/** How many of a mod's changed files were only rebuilt from unchanged code. */
export function rebuiltCount(mod: ModInstall): number {
  return (mod.files?.paths ?? []).filter((file) => file.rebuilt).length;
}

/** The mods with changes to install, across a game's repositories, by repository. */
export function changedMods(
  repositories: RepositoryInstalls[],
): { repository: string; mods: ModInstall[] }[] {
  return repositories
    .map((r) => ({
      repository: r.repository,
      mods: r.status.mods.filter(hasChanges),
    }))
    .filter((r) => r.mods.length > 0);
}

/** The mods a repository holds that were never installed, by repository. They are not changes: a repository may hold mods
 * the person does not want, so installing one is offered, never counted as something left to do. */
export function newMods(
  repositories: RepositoryInstalls[],
): { repository: string; mods: ModInstall[] }[] {
  return repositories
    .map((r) => ({
      repository: r.repository,
      mods: r.status.mods.filter((m) => m.installed === null),
    }))
    .filter((r) => r.mods.length > 0);
}

/** The mods whose textures need encoding: stale first (they would show old pictures), then those never encoded, then those whose
 * textures Waylith unpacks at four times the memory. */
export function encodeTargets(mods: TextureMod[]): TextureMod[] {
  return [
    ...mods.filter((m) => m.stale > 0),
    ...mods.filter((m) => m.stale === 0 && m.missing > 0),
    ...mods.filter((m) => m.stale === 0 && m.missing === 0 && m.unpacked > 0),
  ];
}

/** One line of "Before you play": done, still to do (with the press that does it), or worth knowing. */
export type Check = {
  kind: "ready" | "todo" | "info";
  words: string;
  args: Record<string, string | number>;
  action: "build" | "install-all" | "install-new" | "encode" | null;
};

/**
 * "Before you play": what stands between now and a launch with everything current, or "Ready to play". With `quietDocs` (the
 * owner's choice, 0.80.0), a mod whose only changes are its docs is worth knowing, not something left to do.
 */
export function preflight(
  repositories: RepositoryInstalls[],
  textures: TexturesReading,
  game: string,
  quietDocs = false,
): Check[] {
  const checks: Check[] = [];
  const mods = repositories.flatMap((r) => r.status.mods);
  const running = repositories.some((r) => r.status.gameRunning.length > 0);
  if (running) {
    checks.push({
      kind: "info",
      words: "mods-pre-running",
      args: { game },
      action: null,
    });
  }
  const unbuilt = mods.filter((m) => m.build.needsBuild);
  if (unbuilt.length > 0) {
    checks.push({
      kind: "todo",
      words: "mods-pre-build",
      args: { count: unbuilt.length, ...names(unbuilt.map((m) => m.name)) },
      action: "build",
    });
  }
  const quiet = quietDocs ? mods.filter(docsOnly) : [];
  const changed = mods.filter((m) => hasChanges(m) && !quiet.includes(m));
  if (changed.length > 0) {
    checks.push({
      kind: "todo",
      words: "mods-pre-install",
      args: { count: changed.length, ...names(changed.map((m) => m.name)) },
      action: "install-all",
    });
  }
  if (quiet.length > 0) {
    checks.push({
      kind: "info",
      words: "mods-pre-docs-only",
      args: { count: quiet.length, ...names(quiet.map((m) => m.name)) },
      action: null,
    });
  }
  // Worth knowing, not something left to do, so "Ready to play" still shows beside it.
  const fresh = mods.filter((m) => m.installed === null);
  if (fresh.length > 0) {
    checks.push({
      kind: "info",
      words: "mods-pre-new",
      args: { count: fresh.length, ...names(fresh.map((m) => m.name)) },
      action: "install-new",
    });
  }
  if (textures.state === "reading") {
    checks.push({
      kind: "info",
      words: "mods-pre-textures-reading",
      args: {},
      action: null,
    });
  } else if (textures.state === "failed") {
    checks.push({
      kind: "info",
      words: "mods-pre-textures-failed",
      args: {},
      action: null,
    });
  } else if (textures.state === "ready") {
    const { staleMods, missingMods, missing, unpackedMods, unpacked } =
      textures.status.totals;
    if (staleMods > 0) {
      checks.push({
        kind: "todo",
        words: "mods-pre-textures-stale",
        args: { count: staleMods },
        action: "encode",
      });
    }
    if (missingMods > 0) {
      checks.push({
        kind: "todo",
        words: "mods-pre-textures-missing",
        args: { count: missingMods, pictures: missing },
        action: staleMods > 0 ? null : "encode",
      });
    }
    if (unpackedMods > 0) {
      checks.push({
        kind: "todo",
        words: "mods-pre-textures-unpacked",
        args: { count: unpackedMods, textures: unpacked },
        action: staleMods > 0 || missingMods > 0 ? null : "encode",
      });
    }
  }
  if (!checks.some((c) => c.kind === "todo")) {
    checks.push({
      kind: "ready",
      words:
        textures.state === "ready" ? "mods-pre-ready" : "mods-pre-ready-mods",
      args: {},
      action: null,
    });
  }
  return checks;
}

/** The first few names, and how many more there are, for a message to say "A, B, C and 3 more". */
export function names(
  list: string[],
  shown = 3,
): { names: string; more: number } {
  return {
    names: list.slice(0, shown).join(", "),
    more: Math.max(0, list.length - shown),
  };
}

/** Each kind of file, as a message key. */
export const FILE_WORDS: Record<string, string> = {
  code: "mods-files-code",
  defs: "mods-files-defs",
  patches: "mods-files-patches",
  textures: "mods-files-textures",
  text: "mods-files-text",
  sounds: "mods-files-sounds",
  about: "mods-files-about",
  docs: "mods-files-docs",
  other: "mods-files-other",
};

/** What a settings change says, as a message key. */
export const SETTING_WORDS: Record<SettingChange["what"], string> = {
  added: "mods-setting-added",
  removed: "mods-setting-removed",
  default: "mods-setting-default",
};

/** How many backups a card shows before "Show all". */
export const FIRST_BACKUPS = 2;

/** What happens to a file, as a message key. */
export const FILE_CHANGE_WORDS: Record<
  "added" | "changed" | "removed",
  string
> = {
  added: "mods-file-added",
  changed: "mods-file-changed",
  removed: "mods-file-removed",
};

/** The button beside a "Before you play" line, as a message key. */
export const CHECK_ACTION_WORDS: Record<
  NonNullable<Check["action"]>,
  string
> = {
  build: "mods-pre-action-build",
  "install-all": "mods-pre-action-install-all",
  "install-new": "mods-pre-action-install-new",
  encode: "mods-pre-action-encode",
};
