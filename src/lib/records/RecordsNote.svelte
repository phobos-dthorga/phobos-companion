<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import { formatWhen } from "../shell/dates";
  import type { Automatic, RecordsStatus } from "./types";
  import { readAutomatic, readRecordsStatus } from "./desktopClient";

  /**
   * On Home (0.22.0): a note when the Companion's records have never been copied, or the newest copy is a week old or more, leading
   * to the Settings page's backup. Nothing shows while the copy is recent, or when the status cannot be read. From 0.29.0 it also
   * shows when the last automatic copy failed (a drive not there, a NAS asleep), with why.
   */
  let { game }: { game: string } = $props();

  let status = $state<RecordsStatus | null>(null);
  let automatic = $state<Automatic | null>(null);

  onMount(() => {
    void readRecordsStatus().then((answer) => {
      if (answer.state === "ready") status = answer.status;
    });
    void readAutomatic().then((answer) => {
      if (answer.state === "ready") automatic = answer.automatic;
    });
  });

  const failed = $derived(automatic !== null && !automatic.ok);

  function open() {
    go({ page: "settings", game, focus: { panel: "records" }, dialog: null });
  }
</script>

{#if status?.stale || failed}
  <section class="panel" aria-labelledby="records-note-title">
    <h2 id="records-note-title">{t("records-note-title")}</h2>
    {#if failed && automatic}
      <p>
        {t("records-note-failed", {
          when: formatWhen(automatic.time),
          reason: automatic.refusal ?? "",
        })}
      </p>
    {:else if status}
      <p>
        {status.newest
          ? t("records-note-old", { days: status.ageDays ?? 0 })
          : t("records-note-never")}
      </p>
    {/if}
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
