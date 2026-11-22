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

/** The next pick still waiting after one just answered, else none. */
export function nextWaiting(list: Placed[], after: string): Placed | undefined {
  const at = list.findIndex((p) => keyOf(p) === after);
  const rest = [...list.slice(at + 1), ...list.slice(0, Math.max(0, at))];
  return rest.find((p) => p.pick.answer === null);
}
