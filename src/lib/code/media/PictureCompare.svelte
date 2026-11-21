<script lang="ts">
  import { onMount } from "svelte";
  import { LOCALE, t } from "../../i18n/runtime";
  import { register } from "../../shortcuts/registry";
  import { themeColour } from "./decode";
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
    VIEWS,
    ZOOMS,
    type Backdrop,
    type PictureView,
    type Zoom,
  } from "./viewing";

  /**
   * A changed picture, before and after (0.50.0; the owner's choice of 22 Nov 2026: all four ways): side by side, flicking between
   * them in one place, or what changed marked on a dimmed copy, at a zoom and on a ground the person picks. Z flicks, = steps the
   * zoom. A picture added or removed has one side, shown alone.
   */
  let { before, after }: { before: Raster | null; after: Raster | null } =
    $props();

  let view = $state<PictureView>("side");
  let zoom = $state<Zoom>("fit");
  let backdrop = $state<Backdrop>("checks");
  let flicked = $state<"before" | "after">("after");

  const both = $derived(before !== null && after !== null);
  const difference = $derived(before && after ? compare(before, after) : null);
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
    view === "flick" ? (flicked === "before" ? before : after) : null,
  );

  function flick() {
    if (!both) return;
    view = "flick";
    flicked = flicked === "before" ? "after" : "before";
  }

  function stepZoom() {
    zoom = ZOOMS[(ZOOMS.indexOf(zoom) + 1) % ZOOMS.length];
  }

  /** How wide a picture is drawn: the pane's width when fitted, else its own pixels times the zoom. */
  function widthOf(raster: Raster): string {
    return zoom === "fit" ? "100%" : `${raster.width * zoom}px`;
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

  function number(value: number): string {
    return value.toLocaleString(LOCALE);
  }

  onMount(() =>
    register({
      scope: "code",
      inDialog: true,
      run: { "code.flick": flick, "code.zoom": stepZoom },
    }),
  );
</script>

{#snippet picture(raster: Raster, label: string)}
  <figure class="picture">
    <figcaption>
      <span class="side">{label}</span>
      <span class="muted"
        >{t("media-dimensions", {
          width: number(raster.width),
          height: number(raster.height),
        })}</span
      >
    </figcaption>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="scroll"
      style={backdropStyle(backdrop)}
      role="img"
      aria-label={t("media-picture-label", { side: label })}
      tabindex="0"
    >
      <canvas
        use:paint={raster}
        style:width={widthOf(raster)}
        aria-hidden="true"
      ></canvas>
    </div>
  </figure>
{/snippet}

<div class="controls">
  {#if both}
    <div class="toggles" role="group" aria-label={t("media-view-label")}>
      {#each VIEWS as choice (choice.id)}
        <button
          type="button"
          class="toggle"
          aria-pressed={view === choice.id}
          onclick={() => (view = choice.id)}>{t(choice.words)}</button
        >
      {/each}
    </div>
  {/if}
  <div class="toggles" role="group" aria-label={t("media-zoom-label")}>
    {#each ZOOMS as choice (choice)}
      <button
        type="button"
        class="toggle"
        aria-pressed={zoom === choice}
        onclick={() => (zoom = choice)}
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
        aria-pressed={backdrop === choice.id}
        onclick={() => (backdrop = choice.id)}>{t(choice.words)}</button
      >
    {/each}
  </div>
</div>

{#if !both}
  {#if before}
    <p class="small">{t("media-only-before")}</p>
    {@render picture(before, t("media-side-before"))}
  {:else if after}
    <p class="small">{t("media-only-after")}</p>
    {@render picture(after, t("media-side-after"))}
  {/if}
{:else if view === "side" && before && after}
  <div class="pair">
    {@render picture(before, t("media-side-before"))}
    {@render picture(after, t("media-side-after"))}
  </div>
{:else if view === "flick" && shown}
  <div class="flick">
    <button type="button" class="flick-button" onclick={flick}>
      {flicked === "before"
        ? t("media-flick-to-after")
        : t("media-flick-to-before")}
    </button>
    <p class="small" aria-live="polite">
      {t("media-flick-showing", {
        side:
          flicked === "before" ? t("media-side-before") : t("media-side-after"),
      })}
    </p>
  </div>
  {@render picture(
    shown,
    flicked === "before" ? t("media-side-before") : t("media-side-after"),
  )}
{:else if view === "changed" && marked && difference}
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
      style={backdropStyle(backdrop)}
      role="img"
      aria-label={t("media-changed-caption")}
      tabindex="0"
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

  .scroll {
    overflow: auto;
    max-height: 70vh;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  canvas {
    display: block;
    height: auto;
    image-rendering: pixelated;
  }

  .marked {
    position: relative;
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

  @media (max-width: 900px) {
    .pair {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
