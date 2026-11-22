<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { readPicks } from "./desktopClient";

  /** On Home (0.55.0): how many pictures and sounds wait for the owner's pick, leading to the Picks page. Nothing shows when none wait. */
  let { game }: { game: string } = $props();

  let waiting = $state(0);

  onMount(() => {
    void readPicks().then((answer) => {
      if (answer.state === "ready") waiting = answer.list.waiting;
    });
  });
</script>

{#if waiting > 0}
  <section class="panel" aria-labelledby="picks-note-title">
    <h2 id="picks-note-title">{t("picks-note-title")}</h2>
    <p>{t("picks-waiting", { count: waiting })}</p>
    <button
      type="button"
      class="action"
      onclick={() => go({ page: "picks", game, focus: {}, dialog: null })}
      >{t("picks-note-go")}</button
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
