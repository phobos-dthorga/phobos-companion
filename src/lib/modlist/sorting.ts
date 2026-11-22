import type {
  ListSource,
  ModsListing,
  RuleKind,
  RuleSource,
  SortMove,
} from "./types";

/** Whose rule, in words (0.47.0): the keys are written out so the catalogue check can find them. */
export const SOURCE_WORDS: Record<RuleSource, string> = {
  yours: "modlist-source-yours",
  code: "modlist-source-code",
  own: "modlist-source-own",
  needs: "modlist-source-needs",
  workshop: "modlist-source-workshop",
  community: "modlist-source-community",
  game: "modlist-source-game",
};

/** Where one of your rules can say a mod loads, as the rule maker offers it. */
export const RULE_KINDS: { id: RuleKind; words: string }[] = [
  { id: "after", words: "modlist-rules-kind-after" },
  { id: "before", words: "modlist-rules-kind-before" },
  { id: "top", words: "modlist-rules-kind-top" },
  { id: "bottom", words: "modlist-rules-kind-bottom" },
];

/** A rule in words, by where it says the mod loads. */
export const RULE_WORDS: Record<RuleKind, string> = {
  after: "modlist-rule-after",
  before: "modlist-rule-before",
  top: "modlist-rule-top",
  bottom: "modlist-rule-bottom",
};

/** Which way a sort moves a mod, and how many places. */
export function movedBy(move: SortMove): {
  direction: "up" | "down";
  places: number;
} {
  return {
    direction: move.to < move.from ? "up" : "down",
    places: Math.abs(move.to - move.from),
  };
}

/**
 * A sort's moves told apart (0.59.0; the owner's choice of 23 Nov 2026): those a rule asks for, each shown with its reason, and
 * those only a group or the order of names places, shown folded. A move from an older kit, with no kind, counts as a rule's.
 */
export function movesByKind(moves: SortMove[]): {
  explained: SortMove[];
  grouped: SortMove[];
  ordered: SortMove[];
} {
  return {
    explained: moves.filter(
      (m) => !m.kind || m.kind === "rule" || m.kind === "room",
    ),
    grouped: moves.filter((m) => m.kind === "group"),
    ordered: moves.filter((m) => m.kind === "order"),
  };
}

/** Every mod's name by its id and its key, without case, for showing rules that name mods by id. */
export function namesOf(listing: ModsListing): Map<string, string> {
  const names = new Map<string, string>();
  for (const mod of listing.mods) {
    names.set(mod.id.toLowerCase(), mod.name);
    names.set(mod.key.toLowerCase(), mod.name);
  }
  return names;
}

/** The saved lists' sources in the order the page shows them (0.48.0), each with its title and how it came to be. */
export const LIST_SOURCES: { id: ListSource; title: string; how: string }[] = [
  {
    id: "saved",
    title: "modlist-saved-source-saved",
    how: "modlist-saved-how-saved",
  },
  {
    id: "kept",
    title: "modlist-saved-source-kept",
    how: "modlist-saved-how-kept",
  },
  {
    id: "save",
    title: "modlist-saved-source-save",
    how: "modlist-saved-how-save",
  },
  {
    id: "manager",
    title: "modlist-saved-source-manager",
    how: "modlist-saved-how-manager",
  },
];
