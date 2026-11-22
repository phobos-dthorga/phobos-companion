<script lang="ts">
  import { onMount } from "svelte";
  import { LOCALE, t } from "../i18n/runtime";
  import { register } from "../shortcuts/registry";
  import type { Ground } from "./source";
  import { themeColour } from "./decode";
  import { findEdges, markedPicture, type Edges } from "./edges";
  import { viewSettings } from "./viewSettings.svelte";
  import {
    changedShare,
    compare,
    differencePicture,
    rgbOf,
    type Raster,
  } from "./pixels";
  import {
    BACKDROPS,
    backdropStyle,
    FIT_HEIGHT_SHARE,
    fitScale,
    TOLERANCES,
    VIEWS,
    ZOOMS,
    type Backdrop,
  } from "./viewing";

  /**
   * A changed picture, before and after (0.50.0; the owner's choice of 22 Nov 2026: all four ways): side by side, flicking between
   * them in one place, or what changed marked on a dimmed copy, at a zoom and on a ground the person picks. Z flicks, = steps the
   * zoom. A picture added or removed has one side, shown alone. Since 0.53.0 each side has its own name ("Installed now", "What the
   * game loads"), and What changed lets small differences pass (a picture exported again, or encoded, shifts most pixels a little).
   */
  let {
    before,
    after,
    labels,
    startTolerance = 0,
    alone,
    grounds = [],
    place = "default",
  }: {
    before: Raster | null;
    after: Raster | null;
    labels: { before: string; after: string };
    /** How far a pixel may differ before it is marked, at first. */
    startTolerance?: number;
    /** Words above a picture with one side only. */
    alone?: string;
    /** A game's own grounds (0.55.0, from a picks file): offered after the Companion's, by name. */
    grounds?: Ground[];
    /** Where the pictures are compared: each place keeps its own view, zoom, ground and marks for the run (0.57.0). */
    place?: string;
  } = $props();

  /** The page's own element, to tell whether it sits in a dialog: its keys work only where it is. */
  let here = $state<HTMLElement | null>(null);

  // Kept for the run in this place, so the next pick, try or file is seen as the last one was (0.57.0).
  // svelte-ignore state_referenced_locally
  const settings = viewSettings(place, startTolerance);

  function groundStyle(choice: string): string {
    const own = /^ground-(\d+)$/.exec(choice);
    const colour = own ? grounds[Number(own[1])]?.colour : undefined;
    if (colour) return `background: ${colour};`;
    return backdropStyle(own ? "checks" : (choice as Backdrop));
  }
  /** The frame's inside width, measured, and the window's height: the room a fitted picture has. */
  let roomWidth = $state(0);
  let windowHeight = $state(0);

  const both = $derived(before !== null && after !== null);
  const difference = $derived(
    before && after ? compare(before, after, settings.tolerance) : null,
  );
  const marked = $derived.by((): Raster | null => {
    if (!before || !after || !difference) return null;
    return {
      width: difference.width,
      height: difference.height,
      pixels: differencePicture(
        before,
        after,
        difference,
        rgbOf(themeColour("accent")),
      ),
    };
  });
  const shown = $derived(
    settings.view === "flick"
      ? settings.flicked === "before"
        ? before
        : after
      : null,
  );

  function flick() {
    if (!both) return;
    settings.view = "flick";
    settings.flicked = settings.flicked === "before" ? "after" : "before";
  }

  function stepZoom() {
    settings.zoom = ZOOMS[(ZOOMS.indexOf(settings.zoom) + 1) % ZOOMS.length];
  }

  /** How wide a picture is drawn: whole inside its frame when fitted (0.52.0), else its own pixels times the zoom. */
  function widthOf(raster: Raster): string {
    const zoom = settings.zoom;
    if (zoom !== "fit") return `${raster.width * zoom}px`;
    const scale = fitScale(
      raster.width,
      raster.height,
      roomWidth,
      windowHeight * FIT_HEIGHT_SHARE,
    );
    return `${raster.width * scale}px`;
  }

  /** Keeps `roomWidth` to the frame's inside width as the window or the pane changes size. */
  function measure(frame: HTMLElement) {
    const observer = new ResizeObserver(() => {
      roomWidth = frame.clientWidth;
    });
    observer.observe(frame);
    roomWidth = frame.clientWidth;
    return { destroy: () => observer.disconnect() };
  }

  /** Puts a picture's pixels on a canvas, and again whenever they change. */
  function paint(canvas: HTMLCanvasElement, raster: Raster) {
    const draw = (next: Raster) => {
      canvas.width = next.width;
      canvas.height = next.height;
      canvas
        .getContext("2d")
        ?.putImageData(
          new ImageData(
            next.pixels as Uint8ClampedArray<ArrayBuffer>,
            next.width,
            next.height,
          ),
          0,
          0,
        );
    };
    draw(raster);
    return { update: draw };
  }

  /** Each picture's loose bits, found once and kept while it is shown: finding them takes up to two seconds on a large one. */
  const found = new WeakMap<Raster, { edges: Edges; marked: Raster }>();

  function edgesOf(raster: Raster) {
    let known = found.get(raster);
    if (!known) {
      const edges = findEdges(raster);
      known = {
        edges,
        marked: markedPicture(raster, edges, rgbOf(themeColour("accent"))),
      };
      found.set(raster, known);
    }
    return known;
  }

  function number(value: number): string {
    return value.toLocaleString(LOCALE);
  }

  // A scope of its own (0.55.0), whether in a dialog (the code viewer, a screenshot) or on a page (Mods, Picks).
  onMount(() =>
    register({
      scope: "media",
      inDialog: here?.closest("dialog") != null,
      run: { "media.flick": flick, "media.zoom": stepZoom },
    }),
  );
</script>

<svelte:window bind:innerHeight={windowHeight} />

{#snippet picture(raster: Raster, label: string)}
  {@const loose = settings.edges ? edgesOf(raster) : null}
  <figure class="picture">
    <figcaption>
      <span class="side">{label}</span>
      <span class="muted"
        >{t("media-dimensions", {
          width: number(raster.width),
          height: number(raster.height),
        })}</span
      >
      {#if loose}
        <span class="loose"
          >{t("media-edges-counts", {
            specks: loose.edges.specks,
            strokes: loose.edges.strokes,
            fringe: loose.edges.fringe,
            haze: loose.edges.haze,
          })}</span
        >
      {/if}
    </figcaption>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="scroll"
      style={groundStyle(settings.backdrop)}
      role="img"
      aria-label={t("media-picture-label", { side: label })}
      tabindex="0"
      use:measure
    >
      <canvas
        use:paint={loose ? loose.marked : raster}
        style:width={widthOf(raster)}
        aria-hidden="true"
      ></canvas>
    </div>
  </figure>
{/snippet}

<div class="controls" bind:this={here}>
  {#if both}
    <div class="toggles" role="group" aria-label={t("media-view-label")}>
      {#each VIEWS as choice (choice.id)}
        <button
          type="button"
          class="toggle"
          aria-pressed={settings.view === choice.id}
          onclick={() => (settings.view = choice.id)}>{t(choice.words)}</button
        >
      {/each}
    </div>
  {/if}
  <div class="toggles" role="group" aria-label={t("media-zoom-label")}>
    {#each ZOOMS as choice (choice)}
      <button
        type="button"
        class="toggle"
        aria-pressed={settings.zoom === choice}
        onclick={() => (settings.zoom = choice)}
        >{choice === "fit"
          ? t("media-zoom-fit")
          : t("media-zoom-times", { times: choice })}</button
      >
    {/each}
  </div>
  <div class="toggles" role="group" aria-label={t("media-backdrop-label")}>
    {#each BACKDROPS as choice (choice.id)}
      <button
        type="button"
        class="toggle"
        aria-pressed={settings.backdrop === choice.id}
        onclick={() => (settings.backdrop = choice.id)}
        >{t(choice.words)}</button
      >
    {/each}
    {#each grounds as ground, index (ground.name)}
      <button
        type="button"
        class="toggle"
        aria-pressed={settings.backdrop === `ground-${index}`}
        onclick={() => (settings.backdrop = `ground-${index}`)}
        >{ground.name}</button
      >
    {/each}
  </div>
  <div class="toggles" role="group" aria-label={t("media-edges-label")}>
    <button
      type="button"
      class="toggle"
      aria-pressed={settings.edges}
      onclick={() => (settings.edges = !settings.edges)}
      >{t("media-edges-mark")}</button
    >
  </div>
</div>

{#if !both}
  {#if alone}
    <p class="small">{alone}</p>
  {/if}
  {#if before}
    {@render picture(before, labels.before)}
  {:else if after}
    {@render picture(after, labels.after)}
  {/if}
{:else if settings.view === "side" && before && after}
  <div class="pair">
    {@render picture(before, labels.before)}
    {@render picture(after, labels.after)}
  </div>
{:else if settings.view === "flick" && shown}
  <div class="flick">
    <button type="button" class="flick-button" onclick={flick}>
      {t("media-flick-to", {
        side: settings.flicked === "before" ? labels.after : labels.before,
      })}
    </button>
    <p class="small" aria-live="polite">
      {t("media-flick-showing", {
        side: settings.flicked === "before" ? labels.before : labels.after,
      })}
    </p>
  </div>
  {@render picture(
    shown,
    settings.flicked === "before" ? labels.before : labels.after,
  )}
{:else if settings.view === "changed" && marked && difference}
  <div
    class="toggles tolerance"
    role="group"
    aria-label={t("media-tolerance-label")}
  >
    {#each TOLERANCES as choice (choice)}
      <button
        type="button"
        class="toggle"
        aria-pressed={settings.tolerance === choice}
        onclick={() => (settings.tolerance = choice)}
        >{choice === 0
          ? t("media-tolerance-exact")
          : t("media-tolerance-levels", { levels: choice })}</button
      >
    {/each}
  </div>
  <p class="small" aria-live="polite">
    {#if difference.changed === 0}
      {t("media-changed-none")}
    {:else}
      {t("media-changed-count", {
        count: difference.changed,
        share: changedShare(difference),
      })}
      {#if difference.box}
        {t("media-changed-box", {
          x: number(difference.box.x),
          y: number(difference.box.y),
          width: number(difference.box.width),
          height: number(difference.box.height),
        })}
      {/if}
    {/if}
    {#if !difference.sameSize}
      {t("media-changed-sizes")}
    {/if}
  </p>
  <figure class="picture">
    <figcaption>
      <span class="side">{t("media-changed-caption")}</span>
      <span class="muted">{t("media-changed-key")}</span>
    </figcaption>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="scroll"
      style={groundStyle(settings.backdrop)}
      role="img"
      aria-label={t("media-changed-caption")}
      tabindex="0"
      use:measure
    >
      <div class="marked" style:width={widthOf(marked)}>
        <canvas use:paint={marked} aria-hidden="true"></canvas>
        {#if difference.box}
          <div
            class="box"
            aria-hidden="true"
            style:left={`${(difference.box.x / marked.width) * 100}%`}
            style:top={`${(difference.box.y / marked.height) * 100}%`}
            style:width={`${(difference.box.width / marked.width) * 100}%`}
            style:height={`${(difference.box.height / marked.height) * 100}%`}
          ></div>
        {/if}
      </div>
    </div>
  </figure>
{/if}

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin: 4px 12px 8px;
  }

  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 0 12px;
  }

  .picture {
    min-width: 0;
    margin: 0 12px 12px;
  }

  .pair .picture {
    margin: 0;
  }

  figcaption {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    margin-bottom: 4px;
    font-size: var(--type-small);
  }

  .side {
    font-weight: 600;
  }

  .loose {
    color: var(--colour-accent);
    font-weight: 600;
  }

  .scroll {
    overflow: auto;
    max-height: 70vh;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  canvas {
    display: block;
    height: auto;
    margin-inline: auto;
    image-rendering: pixelated;
  }

  .marked {
    position: relative;
    margin-inline: auto;
  }

  .marked canvas {
    width: 100%;
  }

  .box {
    position: absolute;
    min-width: 2px;
    min-height: 2px;
    outline: 2px solid var(--colour-accent);
    outline-offset: 3px;
    pointer-events: none;
  }

  .flick {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
    margin: 0 12px 6px;
  }

  .flick-button {
    min-height: var(--control-min);
    padding: 0 14px;
    font: inherit;
    font-weight: 600;
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 2px solid var(--colour-accent);
    border-radius: 4px;
    cursor: pointer;
  }

  .small {
    margin: 0 12px 6px;
  }

  .tolerance {
    margin: 0 12px 8px;
  }

  @media (max-width: 900px) {
    .pair {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
