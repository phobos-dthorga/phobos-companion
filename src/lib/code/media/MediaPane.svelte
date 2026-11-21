<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { LOCALE, t } from "../../i18n/runtime";
  import FailurePanel from "../../shell/FailurePanel.svelte";
  import { formatSize } from "../../shell/sizes";
  import type { Failure } from "../../shell/types";
  import {
    openChangedFile,
    readChangedFile,
    saveChangedFile,
    type ChangedFileRequest,
  } from "../desktopClient";
  import type { FileChange, MediaKind } from "../types";
  import {
    decodePicture,
    decodeSound,
    showingOf,
    type PictureReading,
    type SoundReading,
  } from "./decode";
  import PictureCompare from "./PictureCompare.svelte";
  import SoundCompare from "./SoundCompare.svelte";

  /**
   * A changed file that isn't text, in the code viewer (0.50.0; the owner, 22 Nov 2026: "We should support the ability to display
   * multimedia in parts like this"): what it is and its sizes, then pictures and textures compared and sounds played and measured,
   * and for anything else its sizes in words. Either side can be saved as a copy where the person chooses, or opened with its own
   * program; nothing is saved or opened without a press.
   */
  let {
    game,
    repository,
    commit,
    file,
  }: {
    game: string;
    repository: string;
    commit: string | null;
    file: FileChange;
  } = $props();

  type Side = "before" | "after";
  type Loaded =
    | { state: "missing" }
    | { state: "reading" }
    | { state: "failed"; failure: Failure }
    | { state: "picture"; reading: PictureReading }
    | { state: "sound"; reading: SoundReading };

  /** The kinds a copy may be opened as; the host refuses the rest, so the button is not offered for them. */
  const OPENABLE: MediaKind[] = [
    "picture",
    "texture",
    "sound",
    "video",
    "model",
    "font",
    "document",
    "archive",
  ];

  const KIND_WORDS: Record<MediaKind, string> = {
    picture: "media-kind-picture",
    texture: "media-kind-texture",
    sound: "media-kind-sound",
    video: "media-kind-video",
    model: "media-kind-model",
    font: "media-kind-font",
    document: "media-kind-document",
    archive: "media-kind-archive",
    program: "media-kind-program",
    other: "media-kind-other",
  };

  const PROBLEM_WORDS: Record<string, string> = {
    "not-dds": "media-problem-not-dds",
    unsupported: "media-problem-unsupported",
    truncated: "media-problem-truncated",
    "too-large": "media-problem-too-large",
    unreadable: "media-problem-unreadable",
  };

  let sides = $state<Record<Side, Loaded>>({
    before: { state: "reading" },
    after: { state: "reading" },
  });
  let said = $state<string | null>(null);
  let actionFailure = $state<Failure | null>(null);
  let busy = $state(false);
  /** The last press, so a failed one can be tried again. */
  let lastPress: (() => Promise<void>) | null = null;

  const kind = $derived<MediaKind>(file.media ?? "other");
  const showing = $derived(showingOf(file.path));
  const exists = $derived<Record<Side, boolean>>({
    before: file.change !== "added",
    after: file.change !== "removed",
  });

  function requestFor(side: Side): ChangedFileRequest {
    return { game, repository, commit, path: file.path, side };
  }

  async function loadSide(target: FileChange, side: Side): Promise<Loaded> {
    if (
      side === "before"
        ? target.change === "added"
        : target.change === "removed"
    )
      return { state: "missing" };
    const answer = await readChangedFile({
      game,
      repository,
      commit,
      path: target.path,
      side,
    });
    if (answer.state !== "ready")
      return { state: "failed", failure: answer.failure };
    if (showingOf(target.path) === "picture")
      return {
        state: "picture",
        reading: await decodePicture(target.path, answer.bytes),
      };
    return {
      state: "sound",
      reading: await decodeSound(target.path, answer.bytes),
    };
  }

  function letGo(loaded: Loaded) {
    if (loaded.state === "sound" && loaded.reading.ok)
      URL.revokeObjectURL(loaded.reading.address);
  }

  async function load(target: FileChange) {
    said = null;
    actionFailure = null;
    letGo(sides.before);
    letGo(sides.after);
    if (showingOf(target.path) === "words") {
      sides = { before: { state: "missing" }, after: { state: "missing" } };
      return;
    }
    sides = { before: { state: "reading" }, after: { state: "reading" } };
    const [before, after] = await Promise.all([
      loadSide(target, "before"),
      loadSide(target, "after"),
    ]);
    if (target !== file) {
      letGo(before);
      letGo(after);
      return;
    }
    sides = { before, after };
  }

  $effect(() => {
    const target = file;
    untrack(() => void load(target));
  });

  onDestroy(() => {
    letGo(sides.before);
    letGo(sides.after);
  });

  async function save(side: Side) {
    lastPress = () => save(side);
    busy = true;
    actionFailure = null;
    const answer = await saveChangedFile(
      requestFor(side),
      t("media-save-title", { name: file.path.split("/").pop() ?? file.path }),
    );
    busy = false;
    if (answer.state !== "ready") actionFailure = answer.failure;
    else said = answer.path ? t("media-saved", { path: answer.path }) : null;
  }

  async function open(side: Side) {
    lastPress = () => open(side);
    busy = true;
    actionFailure = null;
    const answer = await openChangedFile(requestFor(side));
    busy = false;
    if (answer.state !== "ready") actionFailure = answer.failure;
    else said = t("media-opened", { path: answer.path });
  }

  function size(bytes: number | null | undefined): string {
    return bytes == null ? "" : formatSize(bytes, LOCALE);
  }

  function sizeWords(): string {
    const before = file.sizeBefore;
    const after = file.sizeAfter;
    if (before != null && after != null) {
      const change = before === 0 ? 0 : ((after - before) * 100) / before;
      return t("media-sizes-both", {
        before: size(before),
        after: size(after),
        change: change.toLocaleString(LOCALE, {
          maximumFractionDigits: 1,
          signDisplay: "exceptZero",
        }),
      });
    }
    if (after != null) return t("media-sizes-added", { after: size(after) });
    if (before != null)
      return t("media-sizes-removed", { before: size(before) });
    return "";
  }

  function pictureOf(loaded: Loaded) {
    return loaded.state === "picture" && loaded.reading.ok
      ? loaded.reading.raster
      : null;
  }

  function soundOf(loaded: Loaded) {
    return loaded.state === "sound" && loaded.reading.ok
      ? loaded.reading
      : null;
  }

  function sideWords(side: Side): string {
    return side === "before" ? t("media-side-before") : t("media-side-after");
  }

  const reading = $derived(
    sides.before.state === "reading" || sides.after.state === "reading",
  );
  const picturesReady = $derived(
    (!exists.before || pictureOf(sides.before) !== null) &&
      (!exists.after || pictureOf(sides.after) !== null),
  );
  const soundsReady = $derived(
    (!exists.before || soundOf(sides.before) !== null) &&
      (!exists.after || soundOf(sides.after) !== null),
  );
</script>

<div class="media">
  <p class="what">
    <strong>{t(KIND_WORDS[kind])}</strong>
    {#if sizeWords()}<span class="muted">· {sizeWords()}</span>{/if}
    {#each ["before", "after"] as const as side (side)}
      {@const loaded = sides[side]}
      {#if loaded.state === "picture" && loaded.reading.ok && loaded.reading.format}
        <span class="muted"
          >· {t("media-format", {
            side: sideWords(side),
            format: loaded.reading.format,
          })}</span
        >
      {/if}
    {/each}
  </p>

  <div class="actions" role="group" aria-label={t("media-actions-label")}>
    {#each ["before", "after"] as const as side (side)}
      {#if exists[side]}
        <button
          type="button"
          class="action"
          disabled={busy}
          onclick={() => save(side)}
        >
          {side === "before" ? t("media-save-before") : t("media-save-after")}
        </button>
        {#if OPENABLE.includes(kind)}
          <button
            type="button"
            class="action"
            disabled={busy}
            onclick={() => open(side)}
          >
            {side === "before" ? t("media-open-before") : t("media-open-after")}
          </button>
        {/if}
      {/if}
    {/each}
  </div>
  {#if said}
    <p class="small" aria-live="polite">{said}</p>
  {/if}
  {#if actionFailure}
    <FailurePanel failure={actionFailure} onretry={() => void lastPress?.()} />
  {/if}

  {#if showing === "words"}
    <p class="small">
      {kind === "program" ? t("media-words-program") : t("media-words-other")}
    </p>
  {:else if reading}
    <p class="small" aria-live="polite">{t("media-reading")}</p>
  {:else}
    {#each ["before", "after"] as const as side (side)}
      {@const loaded = sides[side]}
      {#if loaded.state === "failed"}
        <p class="small">{t("media-side-failed", { side: sideWords(side) })}</p>
        <FailurePanel
          failure={loaded.failure}
          onretry={() => void load(file)}
        />
      {:else if (loaded.state === "picture" || loaded.state === "sound") && !loaded.reading.ok}
        <p class="small">
          {t("media-side-problem", {
            side: sideWords(side),
            problem: t(
              PROBLEM_WORDS[loaded.reading.problem] ??
                "media-problem-unreadable",
            ),
          })}
          {#if loaded.state === "picture" && !loaded.reading.ok && loaded.reading.format}
            {t("media-problem-format", { format: loaded.reading.format })}
          {/if}
        </p>
      {/if}
    {/each}
    {#if showing === "picture" && picturesReady}
      {#each ["before", "after"] as const as side (side)}
        {@const loaded = sides[side]}
        {#if loaded.state === "picture" && loaded.reading.ok && loaded.reading.note}
          <p class="small muted">
            {loaded.reading.note === "svg"
              ? t("media-note-svg")
              : t("media-note-layers", { side: sideWords(side) })}
          </p>
        {/if}
      {/each}
      <PictureCompare
        before={pictureOf(sides.before)}
        after={pictureOf(sides.after)}
      />
    {:else if showing === "sound" && soundsReady}
      <SoundCompare
        before={soundOf(sides.before)}
        after={soundOf(sides.after)}
      />
    {/if}
  {/if}
</div>

<style>
  .media {
    padding-bottom: 8px;
  }

  .what {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    margin: 4px 12px 8px;
    font-size: var(--type-small);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0 12px 8px;
  }

  .action {
    min-height: var(--control-min);
    padding: 0 12px;
    font: inherit;
    font-size: var(--type-small);
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .action:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .small {
    margin: 4px 12px 8px;
    font-size: var(--type-small);
  }
</style>
