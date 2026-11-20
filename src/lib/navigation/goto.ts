import type { RepositoryChanges } from "../code/types";
import type { Thing } from "../connections/types";
import type { ReportEntry } from "../reports/types";
import type { Setting } from "../settings/types";
import { plainText } from "../shell/inline";
import type { TestList } from "../tests/types";
import type { Fact } from "../timeline/types";
import { dayOf } from "../shell/dates";
import { place, placeOf, PAGE_NAMES, type PageName, type Place } from "./place";

/**
 * Go to anything (docs/cross-links.md, N2): every kind of thing the pages show, as candidates with words to match and the place
 * each leads to. Gathered from the same readings the pages make, so a result always opens on a page that can show it.
 */
export type Kind =
  | "address"
  | "page"
  | "guide"
  | "version"
  | "entry"
  | "code"
  | "test"
  | "fact"
  | "setting"
  | "report"
  | "watch";

/** The order kinds are listed in. */
export const KINDS: Kind[] = [
  "address",
  "page",
  "guide",
  "code",
  "version",
  "entry",
  "test",
  "fact",
  "setting",
  "report",
  "watch",
];

export type Candidate = {
  kind: Kind;
  label: string;
  detail: string;
  place: Place;
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

/**
 * The Guide's entries (0.34.0): each found by its title and its search words, opening on the Guide. The detail names its kind,
 * so How do I…? answers read apart from pages and words.
 */
export function fromGuide(
  game: string | null,
  entries: { id: string; title: string; words: string[]; kind: string }[],
  kindWords: (kind: string) => string,
): Candidate[] {
  return entries.map((e) => ({
    kind: "guide" as const,
    label: e.title,
    detail: `${kindWords(e.kind)} · ${e.words.join(", ")}`,
    place: place("guide", game, { entry: e.id }),
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
    label: s.description,
    detail: s.key,
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
      const all = `${label} ${c.detail.toLowerCase()}`;
      if (c.kind !== "address" && !words.every((w) => all.includes(w)))
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
