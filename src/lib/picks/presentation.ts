import { NONE, type Pick, type PicksList } from "./types";

/** A pick together with the repository it belongs to and that repository's grounds. */
export type Placed = {
  repository: string;
  grounds: PicksList["repositories"][number]["grounds"];
  pick: Pick;
};

/**
 * Cards that ship as the same file, as one pick (0.96.0; the owner's answer "One pick per file", Picks round two): every try of
 * every card, each labelled with its card and remembering it, so a press answers that card (the kit answers the rest). The pick
 * keeps the first card's id; its answer is the one that picked a try, else the first card's.
 */
export function joinSlots(picks: Pick[]): Pick[] {
  const joined: Pick[] = [];
  const bySlot = new Map<string, Pick[]>();
  for (const pick of picks) {
    if (!pick.slot) {
      joined.push(pick);
      continue;
    }
    const cards = bySlot.get(pick.slot);
    if (cards) cards.push(pick);
    else {
      const first = [pick];
      bySlot.set(pick.slot, first);
      joined.push(pick);
    }
  }
  return joined.map((pick) => {
    const cards = pick.slot ? (bySlot.get(pick.slot) ?? [pick]) : [pick];
    if (cards.length < 2) return pick;
    const picked = cards.find((c) => c.answer && c.answer.pick !== NONE);
    return {
      ...pick,
      cards: cards.length,
      answer: picked
        ? {
            ...picked.answer!,
            pick: `${picked.id}.${picked.answer!.pick}`,
          }
        : pick.answer,
      inGame: cards.some((c) => c.inGame),
      tries: cards.flatMap((card) =>
        card.tries.map((found) => ({
          ...found,
          id: `${card.id}.${found.id}`,
          label: `${found.label} (${card.title})`,
          card: card.id,
          cardTry: found.id,
        })),
      ),
    };
  });
}

/** Every pick in one list, waiting ones first, then by repository in the list's order; a slot's cards as one pick (0.96.0). */
export function allPicks(list: PicksList): Placed[] {
  const placed = list.repositories.flatMap((r) =>
    joinSlots(r.picks).map((pick) => ({
      repository: r.repository,
      grounds: r.grounds,
      pick,
    })),
  );
  return [
    ...placed.filter((p) => p.pick.answer === null),
    ...placed.filter((p) => p.pick.answer !== null),
  ];
}

/** A pick's key on the page and in its address: its repository and id. */
export function keyOf(placed: Pick | Placed, repository?: string): string {
  return "pick" in placed
    ? `${placed.repository}/${placed.pick.id}`
    : `${repository ?? ""}/${placed.id}`;
}

/** The one after (or before) a key in a list, wrapping round; the first when the key is not there. */
export function stepped<T>(list: T[], at: number, step: 1 | -1): T | undefined {
  if (list.length === 0) return undefined;
  if (at < 0) return list[0];
  return list[(at + step + list.length) % list.length];
}

/** The longest a pick's words are shown in the list beside it, in characters; the whole shows on the pick itself. */
export const LIST_WORDS = 80;

/**
 * The owner's words for the list beside a pick (0.76.1; the owner, 24 Nov 2026: "The Companion should show the comments you have
 * recorded, as it feels like they weren't saved otherwise"): trimmed, on one line, cut at a word with an ellipsis when long; "" when
 * there are none.
 */
export function wordsShown(
  words: string | undefined,
  limit = LIST_WORDS,
): string {
  const flat = (words ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit);
  const space = cut.lastIndexOf(" ");
  return `${(space > limit / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** What a press sends for a try: the card and its own try id for a slot's one pick, else the pick's own (0.96.0). */
export function answerFor(
  pick: Pick,
  chosen: string,
): { id: string; pick: string } {
  if (chosen === NONE) return { id: pick.id, pick: NONE };
  const found = pick.tries.find((t) => t.id === chosen);
  return found?.card && found.cardTry
    ? { id: found.card, pick: found.cardTry }
    : { id: pick.id, pick: chosen };
}

/** The quick reasons offered when "none of these" has no words yet (0.96.0; the owner: "Ask, but let me skip"), as message keys. */
export const NONE_REASONS = [
  "picks-reason-subject",
  "picks-reason-style",
  "picks-reason-small",
  "picks-reason-colour",
] as const;

/** The next pick still waiting after one just answered, else none. */
export function nextWaiting(list: Placed[], after: string): Placed | undefined {
  const at = list.findIndex((p) => keyOf(p) === after);
  const rest = [...list.slice(at + 1), ...list.slice(0, Math.max(0, at))];
  return rest.find((p) => p.pick.answer === null);
}
