<script lang="ts">
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import { watched } from "./watched.svelte";
  import { firstToOpen, reportFocus, totalWaiting } from "./watching";

  /**
   * On Home (0.101.0): a note when a report that counts what waits on you found something at the last scan, such as a save check
   * finding a state your mods should never be in. It leads to that report. Nothing shows when nothing was found, or when the
   * tools have no such report for this game. It reads only what the scan kept: it runs nothing itself.
   */
  let { game }: { game: string } = $props();

  const count = $derived(totalWaiting(watched.found[game]));
  const first = $derived(firstToOpen(watched.found[game]));
</script>

{#if count !== null && count > 0 && first}
  <section class="panel attention" aria-labelledby="waiting-note-title">
    <h2 id="waiting-note-title">{t("waiting-note-title")}</h2>
    <p>{t("waiting-note-body", { count })}</p>
    <p class="muted">
      {t("waiting-note-from", { question: first.entry.question })}
    </p>
    <button
      type="button"
      class="action"
      onclick={() => goPage("reports", reportFocus(first.entry))}
      >{t("waiting-note-go")}</button
    >
  </section>
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-inline-start: 3px solid var(--colour-accent);
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
