<script lang="ts">
  import { t } from "../i18n/runtime";
  import { costsOf, loadCosts } from "./costs.svelte";
  import { changeWords, costliest, shareWords } from "./presentation";

  /**
   * The active mods, costliest first (0.121.0, `docs/performance.md` B2; the owner's card "Sort the Mod list by cost", 28 Nov
   * 2026): a list beside Edit the list, never an order of the list itself, since the active side is the load order. Each opens its
   * mod in the board. Shows nothing until a recording names an active mod.
   */
  let {
    game,
    active,
    nameOf,
    onchoose,
  }: {
    game: string;
    /** The active mods' keys, in load order. */
    active: string[];
    nameOf: (key: string) => string;
    onchoose: (key: string) => void;
  } = $props();

  const FIRST = 10;

  $effect(() => loadCosts(game));

  let all = $state(false);
  const data = $derived(costsOf(game));
  const ranked = $derived(costliest(data, active, nameOf));
  const shown = $derived(all ? ranked : ranked.slice(0, FIRST));
</script>

{#if data && ranked.length > 0}
  <details class="ranking">
    <summary
      >{t("modlist-cost-ranking-title", {
        recording: data.label || data.newest,
      })}</summary
    >
    <p class="small muted">{t("modlist-cost-ranking-how")}</p>
    <ol>
      {#each shown as row (row.key)}
        <li>
          <button
            type="button"
            class="action"
            class:flagged={row.flagged}
            onclick={() => onchoose(row.key)}
          >
            <span class="name">{row.name}</span>
            <span class="share">{shareWords(row.share)}</span>
            {#if row.change !== null}<span class="change muted"
                >{changeWords(row.change)}</span
              >{/if}
          </button>
        </li>
      {/each}
    </ol>
    {#if ranked.length > FIRST}
      <button type="button" class="action" onclick={() => (all = !all)}
        >{all
          ? t("modlist-cost-ranking-fewer")
          : t("modlist-cost-ranking-all", { count: ranked.length })}</button
      >
    {/if}
  </details>
{/if}

<style>
  .ranking {
    margin-block: 10px;
    padding: 8px 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  summary {
    min-height: var(--control-min);
    display: flex;
    align-items: center;
    font-weight: 600;
    cursor: pointer;
  }

  ol {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 8px 0;
    padding-inline-start: 28px;
  }

  li .action {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    width: 100%;
    text-align: start;
  }

  .name {
    flex: 1 1 200px;
  }

  .share {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .flagged .share {
    color: var(--colour-risk);
  }
</style>
