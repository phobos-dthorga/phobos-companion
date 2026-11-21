import type { ModsListing, RuleKind, RuleSource, SortMove } from "./types";

/** Whose rule, in words (0.47.0): the keys are written out so the catalogue check can find them. */
export const SOURCE_WORDS: Record<RuleSource, string> = {
  yours: "modlist-source-yours",
  own: "modlist-source-own",
  needs: "modlist-source-needs",
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

/** Every mod's name by its id and its key, without case, for showing rules that name mods by id. */
export function namesOf(listing: ModsListing): Map<string, string> {
  const names = new Map<string, string>();
  for (const mod of listing.mods) {
    names.set(mod.id.toLowerCase(), mod.name);
    names.set(mod.key.toLowerCase(), mod.name);
  }
  return names;
}
