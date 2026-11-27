<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
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

{#if fresh.length > 0 || latest.look.state !== "idle"}
  <section class="panel" aria-labelledby="crash-note-title">
    <h2 id="crash-note-title">{t("crash-note-title")}</h2>
    {#if fresh.length > 0}
      <p>{t("crash-note-dumps", { count: fresh.length })}</p>
      <ul>
        {#each fresh as dump (dump.file)}
          <li>
            {t("crash-note-dump", {
              program: dump.program,
              when: formatWhen(dump.time),
            })}
          </li>
        {/each}
      </ul>
      <div class="buttons">
        <button type="button" class="action" onclick={why}
          >{t("crash-note-why")}</button
        >
        <button type="button" class="action" onclick={gotIt}
          >{t("crash-note-got-it")}</button
        >
      </div>
    {/if}
    {#if latest.look.state === "looking"}
      <p>{t("crash-note-looking", { when: shutdown })}</p>
      <ProgressBar
        progress={latest.look.progress}
        fallback={t("crash-note-looking-bar")}
      />
    {:else if latest.look.state === "done"}
      {#if latest.look.look.files.length === 0}
        <p>
          <span class="mark" aria-hidden="true">✓</span>
          {t("crash-note-clean", {
            when: formatWhen(latest.look.look.lastShutdown),
          })}
        </p>
      {:else}
        <p>
          {t("crash-note-zeroed", {
            count: latest.look.look.files.length,
            when: formatWhen(latest.look.look.lastShutdown),
          })}
        </p>
        <ul class="files">
          {#each latest.look.look.files as file (file.path)}
            <li>
              <code>{file.path}</code>
              <span class="small">{file.kind}: {file.advice}</span>
            </li>
          {/each}
        </ul>
        <p class="small muted">{t("crash-note-zeroed-how")}</p>
      {/if}
    {:else if latest.look.state === "failed"}
      <p class="small">
        {t("crash-note-look-failed", { reason: latest.look.reason })}
      </p>
    {/if}
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

  ul {
    margin: 0 0 10px;
    padding-inline-start: 20px;
  }

  .files li {
    display: grid;
    gap: 2px;
    margin-bottom: 6px;
  }

  code {
    overflow-wrap: anywhere;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .mark {
    color: var(--colour-accent);
  }
</style>
