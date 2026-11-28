import { untrack } from "svelte";
import { readCosts } from "./desktopClient";
import type { CostsData, MethodCost, ModCost } from "./types";

/**
 * What each mod and busy method costs by the newest recording (0.119.0, `docs/performance.md` slice two), read once per game and
 * kept for the run, so the Mods page, the Mod list, the Code map and Home can tag what they show without asking each time. A new
 * recording forgets it, and the next page that asks reads it again.
 */
type Kept = { state: "reading" | "ready"; costs: CostsData | null };

export const costs = $state<{ byGame: Record<string, Kept> }>({ byGame: {} });

/**
 * Reads a game's costs once, unless they are kept already. A failed read keeps nothing, so the next ask tries again. Untracked,
 * so a page's effect that asks never waits on its own write.
 */
export function loadCosts(game: string) {
  untrack(() => {
    if (costs.byGame[game]) return;
    costs.byGame[game] = { state: "reading", costs: null };
    void readCosts(game).then((answer) => {
      if (answer.state === "ready")
        costs.byGame[game] = { state: "ready", costs: answer.costs };
      else delete costs.byGame[game];
    });
  });
}

/** Forgets a game's costs, after a recording made a newer one. */
export function forgetCosts(game: string) {
  delete costs.byGame[game];
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
