<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import type { RecordsStatus } from "./types";
  import { readRecordsStatus } from "./desktopClient";

  /**
   * On Home (0.22.0): a note when the Companion's records have never been copied, or the newest copy is a week old or more, leading
   * to the Settings page's backup. Nothing shows while the copy is recent, or when the status cannot be read.
   */
  let { game }: { game: string } = $props();

  let status = $state<RecordsStatus | null>(null);

  onMount(() => {
    void readRecordsStatus().then((answer) => {
      if (answer.state === "ready") status = answer.status;
    });
  });

  function open() {
    go({ page: "settings", game, focus: { panel: "records" }, dialog: null });
  }
</script>

{#if status?.stale}
  <section class="panel" aria-labelledby="records-note-title">
    <h2 id="records-note-title">{t("records-note-title")}</h2>
    <p>
      {status.newest
        ? t("records-note-old", { days: status.ageDays ?? 0 })
        : t("records-note-never")}
    </p>
    <button type="button" class="action" onclick={open}
      >{t("records-note-go")}</button
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
