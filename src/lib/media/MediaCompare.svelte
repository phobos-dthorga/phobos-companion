<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import type { Failure } from "../shell/types";
  import {
    decodePicture,
    decodeSound,
    showingOf,
    type PictureReading,
    type SoundReading,
  } from "./decode";
  import PictureCompare from "./PictureCompare.svelte";
  import SoundCompare from "./SoundCompare.svelte";
  import { turnedOver, type MediaSide, type MediaSource } from "./source";

  /**
   * Two versions of a picture or a sound, read, decoded and compared (0.53.0, from the code viewer's 0.50.0 pane): pictures and
   * textures side by side, flicked or with what changed marked; sounds played and measured. Used wherever two versions meet: the
   * code viewer, the Mods page, encoded textures, screenshots. Reads both sides again whenever the source's key changes.
   */
  let { source }: { source: MediaSource } = $props();

  type Side = "before" | "after";
  type Loaded =
    | { state: "missing" }
    | { state: "reading" }
    | { state: "failed"; failure: Failure }
    | { state: "picture"; reading: PictureReading }
    | { state: "sound"; reading: SoundReading };

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

  async function loadSide(side: MediaSide | null): Promise<Loaded> {
    if (!side) return { state: "missing" };
    const answer = await side.read();
    if (answer.state !== "ready")
      return { state: "failed", failure: answer.failure };
    if (showingOf(side.path) === "picture") {
      const reading = await decodePicture(side.path, answer.bytes);
      return {
        state: "picture",
        reading:
          reading.ok && side.turnOver
            ? { ...reading, raster: turnedOver(reading.raster) }
            : reading,
      };
    }
    return {
      state: "sound",
      reading: await decodeSound(side.path, answer.bytes),
    };
  }

  function letGo(loaded: Loaded) {
    if (loaded.state === "sound" && loaded.reading.ok)
      URL.revokeObjectURL(loaded.reading.address);
  }

  async function load(target: MediaSource) {
    letGo(sides.before);
    letGo(sides.after);
    sides = { before: { state: "reading" }, after: { state: "reading" } };
    const [before, after] = await Promise.all([
      loadSide(target.before),
      loadSide(target.after),
    ]);
    if (target.key !== source.key) {
      letGo(before);
      letGo(after);
      return;
    }
    sides = { before, after };
  }

  $effect(() => {
    void source.key;
    const target = source;
    untrack(() => void load(target));
  });

  onDestroy(() => {
    letGo(sides.before);
    letGo(sides.after);
  });

  function labelOf(side: Side): string {
    return source[side]?.label ?? "";
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

  const showing = $derived(
    showingOf(source.after?.path ?? source.before?.path ?? ""),
  );
  const reading = $derived(
    sides.before.state === "reading" || sides.after.state === "reading",
  );
  const picturesReady = $derived(
    (!source.before || pictureOf(sides.before) !== null) &&
      (!source.after || pictureOf(sides.after) !== null),
  );
  const soundsReady = $derived(
    (!source.before || soundOf(sides.before) !== null) &&
      (!source.after || soundOf(sides.after) !== null),
  );
</script>

{#if showing === "words"}
  <!-- Only pictures, textures and sounds reach here; the page names anything else in words. -->
{:else if reading}
  <p class="small" aria-live="polite">{t("media-reading")}</p>
{:else}
  {#each ["before", "after"] as const as side (side)}
    {@const loaded = sides[side]}
    {#if loaded.state === "failed"}
      <p class="small">{t("media-side-failed", { side: labelOf(side) })}</p>
      <FailurePanel
        failure={loaded.failure}
        onretry={() => void load(source)}
      />
    {:else if (loaded.state === "picture" || loaded.state === "sound") && !loaded.reading.ok}
      <p class="small">
        {t("media-side-problem", {
          side: labelOf(side),
          problem: t(
            PROBLEM_WORDS[loaded.reading.problem] ?? "media-problem-unreadable",
          ),
        })}
        {#if loaded.state === "picture" && !loaded.reading.ok && loaded.reading.format}
          {t("media-problem-format", { format: loaded.reading.format })}
        {/if}
      </p>
    {:else if loaded.state === "picture" && loaded.reading.ok}
      {#if loaded.reading.format}
        <p class="small muted">
          {t("media-format", {
            side: labelOf(side),
            format: loaded.reading.format,
          })}
        </p>
      {/if}
      {#if loaded.reading.note}
        <p class="small muted">
          {loaded.reading.note === "svg"
            ? t("media-note-svg")
            : t("media-note-layers", { side: labelOf(side) })}
        </p>
      {/if}
    {/if}
  {/each}
  {#if showing === "picture" && picturesReady}
    <PictureCompare
      before={pictureOf(sides.before)}
      after={pictureOf(sides.after)}
      labels={{ before: labelOf("before"), after: labelOf("after") }}
      startTolerance={source.tolerance ?? 0}
      alone={source.alone}
      grounds={source.grounds ?? []}
    />
  {:else if showing === "sound" && soundsReady}
    <SoundCompare
      before={soundOf(sides.before)}
      after={soundOf(sides.after)}
      labels={{ before: labelOf("before"), after: labelOf("after") }}
    />
  {/if}
{/if}

<style>
  .small {
    margin: 4px 12px 8px;
    font-size: var(--type-small);
  }
</style>
