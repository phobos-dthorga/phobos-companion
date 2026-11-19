<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { formatUnixDate, formatTime } from "../shell/dates";
  import WindowDialog from "../shell/WindowDialog.svelte";
  import { showGameFile } from "./desktopClient";
  import { readScreenshots, readShot } from "./shots";

  /**
   * One screenshot whole, over the window (0.32.0), drawn by the App from the trail like the code viewer, so Back closes it and its
   * address reopens it. The host hands over only a picture a list in this run named; opened from an address in a new run, the
   * viewer asks for the game's list first. Show in folder opens the file manager on it.
   */
  let {
    game,
    path,
    name,
    taken,
    onclose,
  }: {
    game: string;
    path: string;
    name: string;
    taken: number;
    onclose: () => void;
  } = $props();

  let source = $state<string | null>(null);
  let failure = $state<string | null>(null);
  let said = $state<string | null>(null);

  const when = $derived(
    `${formatUnixDate(taken)} ${formatTime(new Date(taken * 1000))}`,
  );

  async function load() {
    let answer = await readShot(path);
    if (answer.state !== "ready") {
      await readScreenshots(game);
      answer = await readShot(path);
    }
    if (answer.state !== "ready") {
      failure = answer.failure.detail;
      return;
    }
    source = URL.createObjectURL(new Blob([answer.bytes as BlobPart]));
  }

  async function show() {
    const answer = await showGameFile(path);
    said =
      answer.state === "ready"
        ? t("shots-shown", { name })
        : t("shots-show-failed", { reason: answer.failure.detail });
  }

  onMount(() => {
    void load();
    return () => {
      if (source) URL.revokeObjectURL(source);
    };
  });
</script>

<WindowDialog
  kicker={t("shots-kicker")}
  title={name}
  closeLabel={t("shots-close")}
  copyable
  {onclose}
>
  {#snippet below()}
    <p class="muted small">{when} · <span class="path">{path}</span></p>
    <div class="actions">
      <button type="button" class="action" onclick={show}
        >{t("shots-show-folder")}</button
      >
    </div>
    <div aria-live="polite">
      {#if said}<p class="small" role="status">{said}</p>{/if}
    </div>
  {/snippet}
  {#if source}
    <img class="whole" src={source} alt={t("shots-alt", { name, when })} />
  {:else if failure}
    <p class="refused-line">{t("shots-whole-failed", { reason: failure })}</p>
  {:else}
    <p class="muted">{t("shots-loading")}</p>
  {/if}
</WindowDialog>

<style>
  .whole {
    display: block;
    max-width: 100%;
    max-height: 78vh;
    margin: 0 auto;
    object-fit: contain;
  }

  .path {
    overflow-wrap: anywhere;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
  }
</style>
