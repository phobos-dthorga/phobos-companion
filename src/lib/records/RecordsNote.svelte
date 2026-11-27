<script lang="ts">
  import NoteRow from "../home/NoteRow.svelte";
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
  <NoteRow title={t("records-note-title")}>
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
    {#snippet actions()}
      <button type="button" class="action" onclick={open}
        >{t("records-note-go")}</button
      >
    {/snippet}
  </NoteRow>
{/if}
