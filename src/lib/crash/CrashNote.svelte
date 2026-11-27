<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import NoteRow from "../home/NoteRow.svelte";
  import { formatWhen } from "../shell/dates";
  import { latest, refreshIfStale } from "./latest.svelte";
  import { newDumps, newestTime } from "./presentation";
  import { lastSeen, rememberSeen } from "./seenMemory";

  /**
   * On Home (0.105.0; the owner's choice of 27 Nov 2026, "Home notices by itself"): which programs crashed since you last looked,
   * from the crash dumps Windows kept (never opened here), and, after Windows recorded an unexpected shutdown, one look by itself
   * for files it left filled with zeros. Both only read; the look runs once after each crash, in the background. Nothing shows
   * when there is nothing to say, or when the tools cannot be read.
   */
  let { game }: { game: string } = $props();

  let seen = $state(lastSeen());
  const fresh = $derived(
    latest.status ? newDumps(latest.status.dumps, seen, new Date()) : [],
  );
  const shutdown = $derived(formatWhen(latest.status?.lastShutdown));

  onMount(() => void refreshIfStale());

  function why() {
    go({
      page: "reports",
      game,
      focus: { command: "crash-dump", report: "" },
      dialog: null,
    });
  }

  function gotIt() {
    const newest = newestTime(fresh);
    if (!newest) return;
    rememberSeen(newest);
    seen = newest;
  }
</script>

{#if fresh.length > 0}
  <NoteRow title={t("crash-note-title")} attention>
    <p>
      {t("crash-note-dumps", { count: fresh.length })}
      {fresh
        .map((dump) =>
          t("crash-note-dump", {
            program: dump.program,
            when: formatWhen(dump.time),
          }),
        )
        .join("; ")}
    </p>
    {#snippet actions()}
      <button type="button" class="action" onclick={why}
        >{t("crash-note-why")}</button
      >
      <button type="button" class="action" onclick={gotIt}
        >{t("crash-note-got-it")}</button
      >
    {/snippet}
  </NoteRow>
{/if}
{#if latest.look.state === "looking"}
  <NoteRow title={t("crash-note-look-title")}>
    <p>{t("crash-note-looking", { when: shutdown })}</p>
    <ProgressBar
      progress={latest.look.progress}
      fallback={t("crash-note-looking-bar")}
    />
  </NoteRow>
{:else if latest.look.state === "done" && latest.look.look.files.length > 0}
  {@const files = latest.look.look.files}
  <NoteRow title={t("crash-note-look-title")} attention>
    <p>
      {t("crash-note-zeroed", {
        count: files.length,
        when: formatWhen(latest.look.look.lastShutdown),
      })}
    </p>
    <details>
      <summary>{t("crash-note-files", { count: files.length })}</summary>
      <ul class="files">
        {#each files as file (file.path)}
          <li>
            <code>{file.path}</code>
            <span class="small">{file.kind}: {file.advice}</span>
          </li>
        {/each}
      </ul>
      <p class="small muted">{t("crash-note-zeroed-how")}</p>
    </details>
  </NoteRow>
{:else if latest.look.state === "failed"}
  <NoteRow title={t("crash-note-look-title")}>
    <p>{t("crash-note-look-failed", { reason: latest.look.reason })}</p>
  </NoteRow>
{/if}

<style>
  .files {
    margin: 6px 0;
    padding-inline-start: 18px;
  }

  .files li {
    display: grid;
    gap: 2px;
    margin-bottom: 6px;
  }

  code {
    overflow-wrap: anywhere;
  }

  summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }
</style>
