<script lang="ts">
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
  <section class="panel" aria-labelledby="cleanup-note-title">
    <h2 id="cleanup-note-title">{t("cleanup-note-title")}</h2>
    <p>
      {t("cleanup-note-body", {
        size: formatSize(latest.listing?.bytes ?? 0, LOCALE),
      })}
    </p>
    <button type="button" class="action" onclick={open}
      >{t("cleanup-note-go")}</button
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
