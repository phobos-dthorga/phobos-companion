<script lang="ts">
  import { t } from "../i18n/runtime";
  import { openDialog } from "../navigation/navigation.svelte";
  import ShotThumb from "./ShotThumb.svelte";
  import type { Shot } from "./shots";

  /**
   * Screenshots drawn small in a row that wraps (0.32.0): the first few, then Show all. Pressing one opens it whole, in a dialog
   * the window's trail keeps, so Back closes it.
   */
  let {
    shots,
    label,
    first = 6,
  }: { shots: Shot[]; label: string; first?: number } = $props();

  let all = $state(false);
  const shown = $derived(all ? shots : shots.slice(0, first));

  function open(shot: Shot) {
    openDialog({
      kind: "picture",
      path: shot.path,
      name: shot.name,
      taken: shot.taken,
    });
  }
</script>

<div class="strip" role="group" aria-label={label}>
  {#each shown as shot (shot.path)}
    <ShotThumb {shot} onopen={open} />
  {/each}
</div>
{#if shots.length > first}
  <button type="button" class="action" onclick={() => (all = !all)}
    >{all ? t("shots-fewer") : t("shots-all", { count: shots.length })}</button
  >
{/if}

<style>
  .strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 6px 0;
  }
</style>
