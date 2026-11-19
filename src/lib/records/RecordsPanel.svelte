<script lang="ts">
  import { untrack } from "svelte";
  import { LOCALE, t } from "../i18n/runtime";
  import { formatWhen } from "../shell/dates";
  import { formatSize } from "../shell/sizes";
  import type { RecordsStatus } from "./types";
  import { backupRecords, readRecordsStatus } from "./desktopClient";

  /**
   * Back up your records (0.22.0; docs/later.md, item 2), on the Settings page: what a copy holds, where it goes, how old the newest
   * is, and Back up now. The folder is the setting recordsBackupPath, in the list below; nothing is ever deleted.
   */
  const SETTING = "recordsBackupPath";

  /**
   * `saved` counts the settings saved on the page, so the folder is read again after each (0.26.1: it was read once, so Back up
   * now stayed off after the folder was chosen). `onchoose` opens the folder setting's box to type in.
   */
  let { saved, onchoose }: { saved: number; onchoose: (key: string) => void } =
    $props();

  let status = $state<RecordsStatus | null>(null);
  let unread = $state<string | null>(null);
  let busy = $state(false);
  let told = $state<{ ok: boolean; words: string } | null>(null);

  async function load() {
    const answer = await readRecordsStatus();
    if (answer.state === "ready") {
      status = answer.status;
      unread = null;
    } else {
      unread = answer.failure.detail;
    }
  }

  async function backUp() {
    busy = true;
    told = null;
    const answer = await backupRecords();
    busy = false;
    if (answer.state !== "done") {
      told = {
        ok: false,
        words: t("records-failed", { reason: answer.failure.detail }),
      };
    } else if (!answer.result.ok || !answer.result.copy) {
      told = {
        ok: false,
        words: t("records-failed", { reason: answer.result.refusal ?? "" }),
      };
    } else {
      told = {
        ok: true,
        words: t("records-copied", {
          files: answer.result.copy.files,
          size: formatSize(answer.result.copy.bytes, LOCALE),
          path: answer.result.copy.path,
        }),
      };
    }
    await load();
  }

  const files = $derived(
    status ? status.records.reduce((sum, r) => sum + r.files, 0) : 0,
  );
  const bytes = $derived(
    status ? status.records.reduce((sum, r) => sum + r.bytes, 0) : 0,
  );

  $effect(() => {
    void saved;
    untrack(() => void load());
  });
</script>

<section
  id="settings-records"
  class="records"
  aria-labelledby="settings-records-title"
>
  <h2 id="settings-records-title">{t("records-title")}</h2>
  <p class="small">{t("records-body")}</p>
  {#if unread}
    <p class="told refused" role="status">
      {t("records-unread", { reason: unread })}
    </p>
  {:else if status}
    <p class:stale={status.stale}>
      {status.newest
        ? t("records-last", {
            when: formatWhen(status.newest.time),
            days: status.ageDays ?? 0,
          })
        : t("records-never")}
    </p>
    <p class="muted small">
      {t("records-what", {
        count: status.records.length,
        files,
        size: formatSize(bytes, LOCALE),
      })}
    </p>
    <p class="small where">
      {status.folder
        ? t("records-folder", { path: status.folder })
        : t("records-no-folder")}
    </p>
    <div class="buttons">
      <button
        type="button"
        class="action"
        disabled={busy || !status.folder}
        onclick={backUp}
        >{busy ? t("records-copying") : t("records-back-up")}</button
      >
      <button type="button" class="action" onclick={() => onchoose(SETTING)}
        >{status.folder
          ? t("records-change-folder")
          : t("records-choose-folder")}</button
      >
    </div>
  {/if}
  <div aria-live="polite">
    {#if told}
      <p class={told.ok ? "told" : "told refused"} role="status">
        {told.words}
      </p>
    {/if}
  </div>
</section>

<style>
  .records {
    margin-bottom: 20px;
    padding: 16px 20px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 6px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .stale {
    color: var(--colour-accent);
    font-weight: 600;
  }

  .where {
    overflow-wrap: anywhere;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
  }

  .told {
    margin-top: 10px;
    padding: 6px 10px;
    border: 1px solid var(--colour-success);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .told.refused {
    border-color: var(--colour-risk);
  }
</style>
