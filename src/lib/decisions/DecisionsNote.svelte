<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { readDecisions } from "./desktopClient";

  /** On Home (0.22.0): how many decisions wait for the owner's word, leading to the Decisions page. Nothing shows when none wait. */
  let { game }: { game: string } = $props();

  let waiting = $state(0);

  onMount(() => {
    void readDecisions().then((answer) => {
      if (answer.state === "ready") waiting = answer.list.waiting;
    });
  });
</script>

{#if waiting > 0}
  <section class="panel" aria-labelledby="decisions-note-title">
    <h2 id="decisions-note-title">{t("decisions-note-title")}</h2>
    <p>{t("decisions-waiting", { count: waiting })}</p>
    <button
      type="button"
      class="action"
      onclick={() => go({ page: "decisions", game, focus: {}, dialog: null })}
      >{t("decisions-note-go")}</button
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
