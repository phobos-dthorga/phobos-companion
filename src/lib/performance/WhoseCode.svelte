<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { readMods } from "../modlist/desktopClient";
  import PlayersSay from "../modlist/PlayersSay.svelte";
  import type { ModRow } from "../modlist/types";
  import { refPlace } from "../reports/refs";
  import type { Ref, Report } from "../reports/types";
  import { costsOf, isOurs } from "./costs.svelte";
  import { findingMods, rowOf } from "./presentation";

  /**
   * Whose code it is (0.120.0, `docs/performance.md` X2; the owner, 28 Nov 2026: "Build the author activity link too"): each mod
   * a recording's findings name, with what answers "is it theirs to fix, and will they?". Another author's Workshop mod has What
   * players say: when it was last updated and the uploader's latest replies, read on a press (Workshop pages in Going online
   * switches it off). Ours opens at its changelog; any mod opens in the Mod list where it can be found.
   */
  let {
    game,
    repository,
    report,
  }: { game: string; repository: string | null; report: Report | null } =
    $props();

  let rows = $state<ModRow[]>([]);

  onMount(() => {
    void readMods(game).then((answer) => {
      if (answer.state === "ready") rows = answer.listing.mods;
    });
  });

  const mods = $derived(findingMods(report));
  const costs = $derived(costsOf(game));

  function placeOf(ref: Ref) {
    return refPlace(ref, game, repository, (name) => isOurs(costs, name));
  }
</script>

{#if mods.length > 0}
  <section class="panel" aria-labelledby="performance-whose">
    <h2 id="performance-whose">{t("performance-whose-title")}</h2>
    <p class="small muted">{t("performance-whose-how")}</p>
    <ul class="whose">
      {#each mods as ref (ref.id)}
        {@const row = rowOf(rows, ref)}
        {@const ours = isOurs(costs, ref.id)}
        {@const where = placeOf(ref)}
        <li>
          <span class="name">{ref.id}</span>
          {#if ours}
            <span class="small muted">{t("performance-whose-ours")}</span>
          {/if}
          <span class="buttons">
            {#if !ours && row?.source === "workshop" && row.workshop_id}
              <PlayersSay number={row.workshop_id} name={ref.id} />
            {/if}
            {#if where}
              <button type="button" class="action" onclick={() => go(where)}
                >{ours
                  ? t("performance-whose-changelog")
                  : t("performance-whose-modlist")}</button
              >
            {/if}
          </span>
          {#if !ours && row && row.source !== "workshop"}
            <span class="small muted"
              >{t("performance-whose-not-workshop")}</span
            >
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .panel {
    margin-block: 12px;
    padding: 12px 14px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  h2 {
    margin: 0 0 8px;
    font-size: var(--type-body);
  }

  .whose {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
  }

  .whose li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
  }

  .name {
    font-weight: 600;
  }

  .buttons {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
