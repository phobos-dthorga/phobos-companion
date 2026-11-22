<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import MediaCompare from "../media/MediaCompare.svelte";
  import type { MediaSide, MediaSource } from "../media/source";
  import { formatUnixDate, formatTime } from "../shell/dates";
  import WindowDialog from "../shell/WindowDialog.svelte";
  import { showGameFile } from "./desktopClient";
  import { readScreenshots, readShot, type Shot } from "./shots";

  /**
   * One screenshot whole, over the window (0.32.0), drawn by the App from the trail like the code viewer, so Back closes it and its
   * address reopens it. The host hands over only a picture a list in this run named; opened from an address in a new run, the
   * viewer asks for the game's list first. Show in folder opens the file manager on it. Since 0.53.0 (the owner's choice of 23 Nov
   * 2026) it has the code viewer's zoom and grounds, and compares with the screenshot taken before or after it: flicked, side by
   * side, or what changed marked, to see how a place changed between two days.
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

  let ready = $state(false);
  let failure = $state<string | null>(null);
  let said = $state<string | null>(null);
  /** The game's screenshots, oldest first, for the ones taken either side of this one. */
  let shots = $state<Shot[]>([]);
  let other = $state<Shot | null>(null);

  function whenOf(unix: number): string {
    return `${formatUnixDate(unix)} ${formatTime(new Date(unix * 1000))}`;
  }

  const when = $derived(whenOf(taken));
  const at = $derived(shots.findIndex((s) => s.path === path));
  const earlier = $derived(at > 0 ? shots[at - 1] : null);
  const later = $derived(
    at >= 0 && at < shots.length - 1 ? shots[at + 1] : null,
  );

  function sideOf(shot: { path: string }, label: string): MediaSide {
    return { label, path: shot.path, read: () => readShot(shot.path) };
  }

  const source = $derived<MediaSource>({
    key: `${path}/${other?.path ?? ""}`,
    before: other
      ? sideOf(other, t("shots-compare-label", { when: whenOf(other.taken) }))
      : null,
    after: sideOf({ path }, t("shots-compare-label", { when })),
    tolerance: 0,
    place: "screenshots",
  });

  async function load() {
    // The list names every picture the host may hand over, this one included, in this run.
    const listed = await readScreenshots(game);
    if (listed.state === "ready")
      shots = [...listed.shots.list].sort((a, b) => a.taken - b.taken);
    const answer = await readShot(path);
    if (answer.state !== "ready") {
      failure = answer.failure.detail;
      return;
    }
    ready = true;
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
      {#if earlier}
        <button
          type="button"
          class="toggle"
          aria-pressed={other?.path === earlier.path}
          onclick={() => (other = earlier)}
          >{t("shots-compare-earlier", { when: whenOf(earlier.taken) })}</button
        >
      {/if}
      {#if later}
        <button
          type="button"
          class="toggle"
          aria-pressed={other?.path === later.path}
          onclick={() => (other = later)}
          >{t("shots-compare-later", { when: whenOf(later.taken) })}</button
        >
      {/if}
      {#if other}
        <button type="button" class="action" onclick={() => (other = null)}
          >{t("shots-compare-stop")}</button
        >
      {/if}
    </div>
    <div aria-live="polite">
      {#if said}<p class="small" role="status">{said}</p>{/if}
    </div>
  {/snippet}
  {#if ready}
    <MediaCompare {source} />
  {:else if failure}
    <p class="refused-line">{t("shots-whole-failed", { reason: failure })}</p>
  {:else}
    <p class="muted">{t("shots-loading")}</p>
  {/if}
</WindowDialog>

<style>
  .path {
    overflow-wrap: anywhere;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
  }
</style>
