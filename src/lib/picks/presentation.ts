import type { Pick, PicksList } from "./types";

/** A pick together with the repository it belongs to and that repository's grounds. */
export type Placed = {
  repository: string;
  grounds: PicksList["repositories"][number]["grounds"];
  pick: Pick;
};

/** Every pick in one list, waiting ones first, then by repository in the list's order. */
export function allPicks(list: PicksList): Placed[] {
  const placed = list.repositories.flatMap((r) =>
    r.picks.map((pick) => ({
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

/** The next pick still waiting after one just answered, else none. */
export function nextWaiting(list: Placed[], after: string): Placed | undefined {
  const at = list.findIndex((p) => keyOf(p) === after);
  const rest = [...list.slice(at + 1), ...list.slice(0, Math.max(0, at))];
  return rest.find((p) => p.pick.answer === null);
}
