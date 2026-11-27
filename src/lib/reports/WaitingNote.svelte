<script lang="ts">
  import NoteRow from "../home/NoteRow.svelte";
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
  <NoteRow title={t("waiting-note-title")} attention>
    <p>{t("waiting-note-body", { count })}</p>
    <p class="muted">
      {t("waiting-note-from", { question: first.entry.question })}
    </p>
    {#snippet actions()}
      <button
        type="button"
        class="action"
        onclick={() => goPage("reports", reportFocus(first.entry))}
        >{t("waiting-note-go")}</button
      >
    {/snippet}
  </NoteRow>
{/if}
