<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { latest, refreshIfStale } from "./latest.svelte";

  /**
   * On Home (0.69.0): how many of the game's Workshop items have a newer version than the one on Steam, leading to the Publish
   * page. Read quietly from the kit's `pending`, at most every half hour, as Home's other notes are; nothing shows when none wait.
   */
  let { game }: { game: string } = $props();

  onMount(() => void refreshIfStale(game));

  const waiting = $derived(latest.game === game ? latest.waiting : 0);
</script>

{#if waiting > 0}
  <section class="panel" aria-labelledby="publish-note-title">
    <h2 id="publish-note-title">{t("publish-note-title")}</h2>
    <p>{t("publish-note-body", { count: waiting })}</p>
    <button
      type="button"
      class="action"
      onclick={() => go({ page: "publish", game, focus: {}, dialog: null })}
      >{t("publish-note-go")}</button
    >
  </section>
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  p {
    margin-bottom: 10px;
  }
</style>
