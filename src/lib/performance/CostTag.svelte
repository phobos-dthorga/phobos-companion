<script lang="ts">
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { place } from "../navigation/place";
  import { costsOf, loadCosts, methodCost, modCost } from "./costs.svelte";
  import { changeWords, shareWords } from "./presentation";

  /**
   * A mod's or a method's cost by the newest recording (0.119.0, `docs/performance.md` B1 to B3): its share of ticking and how it
   * moved against the earlier recordings, opening that recording on the Performance page. Shows nothing until a recording names it.
   */
  let {
    game,
    name = null,
    pkg = null,
    method = null,
  }: {
    game: string;
    name?: string | null;
    pkg?: string | null;
    method?: string | null;
  } = $props();

  $effect(() => loadCosts(game));

  const data = $derived(costsOf(game));
  const found = $derived.by(() => {
    if (method) {
      const cost = methodCost(data, method);
      return cost
        ? { share: 100 * cost.share, change: null, flagged: false }
        : null;
    }
    const cost = modCost(data, name, pkg);
    return cost && cost.share > 0
      ? { share: cost.share, change: cost.change, flagged: cost.flagged }
      : null;
  });
</script>

{#if data && found}
  <button
    type="button"
    class="cost"
    class:flagged={found.flagged}
    aria-label={t("performance-cost-label", {
      share: shareWords(found.share),
      recording: data.label || data.newest,
    })}
    onclick={() => go(place("performance", game, { recording: data.newest }))}
    >{t("performance-cost", {
      share: shareWords(found.share),
    })}{#if found.change !== null}
      <span class="change">{changeWords(found.change)}</span>{/if}</button
  >
{/if}

<style>
  .cost {
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    font-size: var(--type-small);
    font-variant-numeric: tabular-nums;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
  }

  .cost:hover,
  .cost:focus-visible {
    border-color: var(--colour-accent);
  }

  .cost.flagged {
    border-color: var(--colour-risk);
  }

  .change {
    margin-inline-start: 6px;
    color: var(--colour-text-muted);
  }
</style>
