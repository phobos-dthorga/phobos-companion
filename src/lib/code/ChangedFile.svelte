<script lang="ts">
  import { LOCALE, t } from "../i18n/runtime";
  import { showingOf } from "../media/decode";
  import MediaCompare from "../media/MediaCompare.svelte";
  import type { MediaSide, MediaSource } from "../media/source";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import { formatSize } from "../shell/sizes";
  import type { Failure } from "../shell/types";
  import {
    openChangedFile,
    readChangedFile,
    saveChangedFile,
    type ChangedFileRequest,
  } from "./desktopClient";
  import type { FileChange, MediaKind } from "./types";

  /**
   * A changed file that isn't text, in the code viewer (0.50.0; the owner, 22 Nov 2026: "We should support the ability to display
   * multimedia in parts like this"): what it is and its sizes, then pictures and textures compared and sounds played and measured
   * (`MediaCompare`, shared with other pages since 0.53.0), and for anything else its sizes in words. Either side can be saved as a
   * copy where the person chooses, or opened with its own program; nothing is saved or opened without a press.
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

  function sideOf(side: Side): MediaSide | null {
    if (!exists[side]) return null;
    const request = requestFor(side);
    return {
      label: side === "before" ? t("media-side-before") : t("media-side-after"),
      path: side === "before" ? (file.oldPath ?? file.path) : file.path,
      read: () => readChangedFile(request),
    };
  }

  const source = $derived<MediaSource>({
    key: `${repository}/${commit ?? "uncommitted"}/${file.path}`,
    before: sideOf("before"),
    after: sideOf("after"),
    tolerance: 0,
    place: "code",
    alone: exists.before ? t("media-only-before") : t("media-only-after"),
  });

  $effect(() => {
    void file.path;
    said = null;
    actionFailure = null;
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
</script>

<div class="media">
  <p class="what">
    <strong>{t(KIND_WORDS[kind])}</strong>
    {#if sizeWords()}<span class="muted">· {sizeWords()}</span>{/if}
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
  {:else}
    <MediaCompare {source} />
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
