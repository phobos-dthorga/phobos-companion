import { untrack } from "svelte";
import { readCosts } from "./desktopClient";
import type { CostsData, MethodCost, ModCost } from "./types";

/**
 * What each mod and busy method costs by the newest recording (0.119.0, `docs/performance.md` slice two), read once per game and
 * kept for the run, so the Mods page, the Mod list, the Code map and Home can tag what they show without asking each time. A new
 * recording forgets it, and the next page that asks reads it again.
 */
type Kept = {
  gen: number;
  state: "reading" | "ready";
  costs: CostsData | null;
};

/** Each read's number: an answer for an older read than the one kept is dropped (0.122.1). */
let generation = 0;

/** Whether an answer has the shape costs gives; a refusal or anything else is no costs. */
export function validCosts(data: unknown): data is CostsData {
  const found = data as Partial<CostsData> | null;
  return (
    !!found &&
    typeof found.newest === "string" &&
    Array.isArray(found.mods) &&
    Array.isArray(found.methods) &&
    !!found.own
  );
}

export const costs = $state<{ byGame: Record<string, Kept> }>({ byGame: {} });

/**
 * Reads a game's costs once, unless they are kept already. A failed read keeps nothing, so the next ask tries again. Untracked,
 * so a page's effect that asks never waits on its own write.
 */
export function loadCosts(game: string) {
  untrack(() => {
    if (costs.byGame[game]) return;
    const gen = ++generation;
    costs.byGame[game] = { gen, state: "reading", costs: null };
    void readCosts(game).then((answer) => {
      if (costs.byGame[game]?.gen !== gen) return;
      // A refusal (no recordings yet) or a failed read is no costs for the run, until a recording ends; never a crash.
      const found =
        answer.state === "ready" && validCosts(answer.costs)
          ? answer.costs
          : null;
      costs.byGame[game] = { gen, state: "ready", costs: found };
    });
  });
}

/** Forgets a game's costs after a recording made a newer one, and reads them again at once, so every tag shown updates. */
export function forgetCosts(game: string) {
  delete costs.byGame[game];
  loadCosts(game);
}

/** A game's costs, once read; null while reading, or when its tools have no recordings. */
export function costsOf(game: string): CostsData | null {
  return costs.byGame[game]?.costs ?? null;
}

/** One mod's cost, found by its package ID first and its name second. */
export function modCost(
  data: CostsData | null,
  name: string | null,
  pkg: string | null = null,
): ModCost | null {
  if (!data) return null;
  const id = pkg?.toLowerCase().replace(/_steam$/, "");
  return (
    (id ? data.mods.find((m) => m.package && m.package === id) : undefined) ??
    (name ? data.mods.find((m) => m.name === name) : undefined) ??
    null
  );
}

/** One method's cost by its full name, or a code map's id for it (`cs:Namespace.Type.Method`). */
export function methodCost(
  data: CostsData | null,
  name: string,
): MethodCost | null {
  if (!data) return null;
  const plain = name.startsWith("cs:") ? name.slice(3) : name;
  return data.methods.find((m) => m.name === plain) ?? null;
}

/** Whether a mod is one of ours, by the newest recording. */
export function isOurs(data: CostsData | null, name: string): boolean {
  return modCost(data, name)?.ours ?? false;
}
