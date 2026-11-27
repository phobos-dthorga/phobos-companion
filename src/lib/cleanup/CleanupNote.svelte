<script lang="ts">
  import NoteRow from "../home/NoteRow.svelte";
  import { onMount } from "svelte";
  import { LOCALE, t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { formatSize } from "../shell/sizes";
  import { latest, refreshIfStale } from "./latest.svelte";
  import { worthMentioning } from "./presentation";

  /**
   * On Home (0.27.0): a note when the tools could clear 5 GB or more, leading to the Settings page's Clean up. The listing is read
   * quietly, at most every half hour; nothing shows below that, or when it cannot be read.
   */
  let { game }: { game: string } = $props();

  onMount(() => void refreshIfStale());

  function open() {
    go({ page: "settings", game, focus: { panel: "cleanup" }, dialog: null });
  }
</script>

{#if worthMentioning(latest.listing)}
  <NoteRow title={t("cleanup-note-title")}>
    <p>
      {t("cleanup-note-body", {
        size: formatSize(latest.listing?.bytes ?? 0, LOCALE),
      })}
    </p>
    {#snippet actions()}
      <button type="button" class="action" onclick={open}
        >{t("cleanup-note-go")}</button
      >
    {/snippet}
  </NoteRow>
{/if}
