import type { RepositoryChanges } from "../code/types";
import type { Thing } from "../connections/types";
import type { ReportEntry } from "../reports/types";
import type { Setting } from "../settings/types";
import { plainText } from "../shell/inline";
import { commitRequest } from "../code/presentation";
import { definitionName } from "../reports/lookup";
import type { TestList } from "../tests/types";
import type { Fact } from "../timeline/types";
import { dayOf } from "../shell/dates";
import { PAGE_TABS } from "../shell/tabs";
import { place, placeOf, PAGE_NAMES, type PageName, type Place } from "./place";

/**
 * Go to anything (docs/cross-links.md, N2): every kind of thing the pages show, as candidates with words to match and the place
 * each leads to. Gathered from the same readings the pages make, so a result always opens on a page that can show it.
 */
export type Kind =
  | "address"
  | "page"
  | "action"
  /** Look a definition up by the name typed (0.110.0). */
  | "lookup"
  | "guide"
  /** A mod on this PC, opening the Mod list's editor on it (0.110.0). */
  | "mod"
  /** A recent commit, opening its code (0.110.0). */
  | "commit"
  | "version"
  | "entry"
  | "code"
  | "test"
  | "fact"
  | "setting"
  | "report"
  | "watch"
  | "recording";

/** The order kinds are listed in. */
export const KINDS: Kind[] = [
  "address",
  "page",
  "action",
  "lookup",
  "guide",
  "mod",
  "code",
  "commit",
  "version",
  "entry",
  "test",
  "fact",
  "setting",
  "report",
  "watch",
  "recording",
];

export type Candidate = {
  kind: Kind;
  label: string;
  detail: string;
  place: Place;
  /** More words it is found by, never shown (0.110.0: a Guide entry's whole text). */
  match?: string;
};

export const PER_KIND = 8;

export function fromPages(
  game: string | null,
  words: (page: PageName) => string,
  hidden: readonly PageName[] = [],
): Candidate[] {
  return PAGE_NAMES.filter((page) => !hidden.includes(page)).map((page) => ({
    kind: "page",
    label: words(page),
    detail: "",
    place: place(page, game),
  }));
}

/** Each tab of a page that has them (0.66.0), as "Settings › Folders and files": a place of its own, like a page. */
export function fromTabs(
  game: string | null,
  pageWords: (page: PageName) => string,
  words: (key: string) => string,
): Candidate[] {
  return (Object.keys(PAGE_TABS) as PageName[]).flatMap((page) =>
    (PAGE_TABS[page] ?? []).map((tab) => ({
      kind: "page" as const,
      label: `${pageWords(page)} › ${words(tab.words)}`,
      detail: "",
      place: place(page, game, { tab: tab.id }),
    })),
  );
}

/**
 * Things to do that open the page where they are done, never doing them from here: Look inside the running game opens the
 * Explorer with its question asked, so a snapshot is still taken only on the person's confirmation in the card. Offered only
 * where the game's page can serve.
 */
export function fromActions(
  game: string | null,
  actions: {
    label: string;
    detail: string;
    page: PageName;
    focus: Record<string, string>;
  }[],
): Candidate[] {
  return actions.map((a) => ({
    kind: "action" as const,
    label: a.label,
    detail: a.detail,
    place: place(a.page, game, a.focus),
  }));
}

/**
 * The Guide's entries (0.34.0): each found by its title and its search words, opening on the Guide. The detail names its kind,
 * so How do I…? answers read apart from pages and words.
 */
export function fromGuide(
  game: string | null,
  entries: {
    id: string;
    title: string;
    words: string[];
    kind: string;
    text?: string;
  }[],
  kindWords: (kind: string) => string,
): Candidate[] {
  return entries.map((e) => ({
    kind: "guide" as const,
    label: e.title,
    detail: `${kindWords(e.kind)} · ${e.words.join(", ")}`,
    place: place("guide", game, { entry: e.id }),
    match: e.text ?? "",
  }));
}

/** The mods on this PC (0.110.0), each opening the Mod list's editor with it in focus. */
export function fromMods(
  game: string,
  mods: { key: string; id: string; name: string; authors: string }[],
  detail: (mod: { id: string; authors: string }) => string,
): Candidate[] {
  return mods.map((m) => ({
    kind: "mod" as const,
    label: m.name,
    detail: detail(m),
    place: place("modlist", game, { view: "edit", mod: m.key }),
    match: m.id,
  }));
}

/** A search shaped like a definition's name (0.110.0) offers to look it up, on the Reports page's Look up tab. */
export function fromLookUp(
  game: string | null,
  query: string,
  words: (name: string) => string,
): Candidate[] {
  const name = query.trim();
  if (!game || !definitionName(name) || !/[A-Za-z]/.test(name)) return [];
  return [
    {
      kind: "lookup",
      label: words(name),
      detail: "",
      place: place("reports", game, { tab: "lookup", name, look: "who" }),
      match: name,
    },
  ];
}

/** A repository's recent commits (0.110.0), each opening its code over the Changes page. */
export function fromCommits(
  game: string,
  repository: string,
  commits: { hash: string; time: string | null; subject: string }[],
): Candidate[] {
  return commits.map((c) => ({
    kind: "commit" as const,
    label: c.subject,
    detail: `${repository}${c.time ? ` · ${dayOf(c.time)}` : ""}`,
    place: {
      page: "changes",
      game,
      focus: { repository },
      dialog: {
        kind: "code",
        request: commitRequest(repository, c.hash, c.subject),
      },
    },
    match: c.hash,
  }));
}

export function fromChanges(
  game: string,
  repositories: RepositoryChanges[],
): Candidate[] {
  const found: Candidate[] = [];
  for (const repository of repositories) {
    for (const log of repository.changelogs) {
      const focus = {
        repository: repository.repository,
        changelog: log.changelog,
      };
      for (const version of log.versions) {
        if (version.version !== "Unreleased") {
          found.push({
            kind: "version",
            label: `${log.product} ${version.version}`,
            detail: version.summary || version.heading,
            place: place("changes", game, focus),
          });
        }
        for (const entry of version.entries) {
          found.push({
            kind: "entry",
            label: plainText(entry.lead || entry.text),
            detail: `${log.product} ${version.version}${entry.section ? ` · ${entry.section}` : ""}`,
            place: {
              ...place("changes", game, focus),
              dialog: {
                kind: "code",
                request: {
                  repository: repository.repository,
                  changelog: log.changelog,
                  product: log.product,
                  entry: {
                    version: entry.version,
                    section: entry.section,
                    text: entry.text,
                    lead: entry.lead,
                  },
                },
              },
            },
          });
        }
      }
    }
  }
  return found;
}

export function fromTests(game: string, lists: TestList[]): Candidate[] {
  return lists.flatMap((list) =>
    list.rows.map((row) => ({
      kind: "test" as const,
      label: `${row.id}: ${plainText(row.title)}`,
      detail: row.section,
      place: place("tests", game, { repository: list.repository, row: row.id }),
    })),
  );
}

/** Versions written, released or installed: the facts worth going to by name. */
export function fromTimeline(game: string, facts: Fact[]): Candidate[] {
  return facts
    .filter(
      (f) =>
        [
          "version-written",
          "version-released",
          "installed",
          "went-back",
        ].includes(f.kind) && f.version,
    )
    .map((f) => ({
      kind: "fact" as const,
      label: `${f.product ?? f.mod ?? ""} ${f.version}`,
      detail: `${f.kind.replace("-", " ")} · ${dayOf(f.time)}`,
      place: place("timeline", game, { day: dayOf(f.time) }),
    }));
}

export function fromSettings(settings: Setting[]): Candidate[] {
  return settings.map((s) => ({
    kind: "setting" as const,
    label: s.name || s.description,
    detail: s.name ? `${s.description} · ${s.key}` : s.key,
    place: place("settings", null, { key: s.key }),
  }));
}

export function fromReports(game: string, entries: ReportEntry[]): Candidate[] {
  return entries.map((e) => ({
    kind: "report" as const,
    label: e.question,
    detail: [e.command, e.report].filter(Boolean).join(" "),
    place: place("reports", game, {
      command: e.command,
      report: e.report ?? "",
    }),
  }));
}

/** Memory watches kept for the game, by their start and label (0.23.0). */
export function fromWatches(
  game: string,
  kept: { watch: string; label: string; started: number }[],
  when: (unix: number) => string,
): Candidate[] {
  return kept.map((k) => ({
    kind: "watch" as const,
    label: [when(k.started), k.label].filter(Boolean).join(" · "),
    detail: k.watch,
    place: place("memory", game, { watch: k.watch }),
  }));
}

/** Performance recordings kept for the game (0.119.0, `docs/performance.md` B6), by their label and what they found first. */
export function fromRecordings(
  game: string,
  kept: {
    recording: string;
    label: string;
    recorded_at: string;
    findings?: { text: string }[];
  }[],
): Candidate[] {
  return kept.map((k) => ({
    kind: "recording" as const,
    label: [k.recorded_at, k.label].filter(Boolean).join(" · ") || k.recording,
    detail: k.findings?.[0]?.text ?? k.recording,
    place: place("performance", game, { recording: k.recording }),
    match: k.recording,
  }));
}

export function fromCode(
  game: string,
  repository: string,
  things: Thing[],
): Candidate[] {
  return things.map((thing) => ({
    kind: "code" as const,
    label: thing.name,
    detail: `${thing.kind} · ${thing.file ? `${thing.file}:${thing.line ?? ""}` : repository}`,
    place: place("codemap", game, { repository, node: thing.id }),
  }));
}

/** A pasted address, as the one candidate it is. */
export function fromAddress(query: string, words: string): Candidate[] {
  const where = placeOf(query);
  return where
    ? [{ kind: "address", label: words, detail: query.trim(), place: where }]
    : [];
}

/**
 * The candidates matching a search, best first within each kind, at most PER_KIND of each: every word of the search must appear
 * in the label or the detail, ignoring case; a label that starts with the search beats one that contains it, which beats a match
 * in the detail. An empty search matches only the pages.
 */
export function rank(
  candidates: Candidate[],
  query: string,
  perKind = PER_KIND,
): Candidate[] {
  const text = query.trim().toLowerCase();
  if (!text) return candidates.filter((c) => c.kind === "page");
  const words = text.split(/\s+/);
  const scored = candidates
    .map((c) => {
      const label = c.label.toLowerCase();
      const all = `${label} ${c.detail.toLowerCase()} ${(c.match ?? "").toLowerCase()}`;
      if (
        c.kind !== "address" &&
        c.kind !== "lookup" &&
        !words.every((w) => all.includes(w))
      )
        return null;
      const score = label.startsWith(text)
        ? 0
        : label.includes(text)
          ? 1
          : words.every((w) => label.includes(w))
            ? 2
            : 3;
      return { c, score };
    })
    .filter((s): s is { c: Candidate; score: number } => s !== null);
  const found: Candidate[] = [];
  for (const kind of KINDS) {
    const ofKind = scored
      .filter((s) => s.c.kind === kind)
      .sort((a, b) => a.score - b.score || a.c.label.length - b.c.label.length);
    found.push(...ofKind.slice(0, perKind).map((s) => s.c));
  }
  return found;
}
