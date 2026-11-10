<script lang="ts">
  /*
   * The globe on screen: the canvas, its labels and the buttons that move it. It is told what to show and reports what
   * the person picked; it decides nothing. Three.js loads on demand; when it cannot draw, the parent says so and the
   * tables still answer.
   */
  import { onMount } from "svelte";
  import { readChartTheme } from "../charts/chartTheme";
  import { t } from "../i18n/runtime";
  import { overlayColours, viewColours } from "./colours";
  import type { GlobeScene } from "./globeScene";
  import { placeLabels, type LabelCandidate, type PlacedLabel } from "./labels";
  import { decodeArray } from "./planet";
  import type { Atlas } from "./presentation";

  type Props = {
    atlas: Atlas;
    view: string;
    overlay: string | null;
    shown: Record<string, boolean>;
    selected: number | null;
    focus: { tile: number; request: number } | null;
    onselect: (tile: number) => void;
    onfailed: () => void;
  };

  let {
    atlas,
    view,
    overlay,
    shown,
    selected,
    focus,
    onselect,
    onfailed,
  }: Props = $props();

  const TEXTURE_WIDTH = 2048;
  const LINE_COLOURS = { river: "#5fa8e8", road: "#d9c38f" };
  const LABEL_LIMIT = 60;
  const PLACE_LABEL_RISE_PX = 14;
  const ALL_PLACES_FROM_PX = 5;
  const REGION_FROM_PX = 50;
  const REGION_UNTIL_PX = 900;

  let canvas: HTMLCanvasElement;
  let frame: HTMLDivElement;
  let scene = $state.raw<GlobeScene | null>(null);
  let labels = $state<PlacedLabel[]>([]);
  let ready = $state(false);
  const colourCache = new Map<string, Uint8Array>();

  function coloursFor(key: string, asOverlay: boolean): Uint8Array | null {
    const cached = colourCache.get(key);
    if (cached) return cached;
    const layer = atlas.globe.layers.find((l) => l.key === key);
    const values = atlas.values.get(key);
    if (!layer || !values) return null;
    const made = asOverlay
      ? overlayColours(layer, values, TEXTURE_WIDTH)
      : viewColours(layer, values, TEXTURE_WIDTH);
    colourCache.set(key, made);
    return made;
  }

  /** Recomputes the labels after each drawing: places, and region names at a size that suits the zoom. */
  function relabel() {
    const drawn = scene;
    if (!drawn) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const tilePixels = drawn.tilePixels;
    const roles = readChartTheme().roles;
    const candidates: LabelCandidate[] = [];
    if (shown.places) {
      const p = atlas.planet.positions;
      atlas.globe.places.forEach((place, index) => {
        const important = place.priority >= 30 || place.tile === selected;
        if (!important && tilePixels < ALL_PLACES_FROM_PX) return;
        const at = drawn.project(
          p[place.tile * 3],
          p[place.tile * 3 + 1],
          p[place.tile * 3 + 2],
        );
        if (!at.facing) return;
        candidates.push({
          key: `place-${index}`,
          text: place.label,
          x: at.x,
          y: at.y - PLACE_LABEL_RISE_PX,
          priority: place.priority + (place.tile === selected ? 100 : 0),
          kind: "place",
          colour: roles[place.role],
        });
      });
    }
    if (shown.regions) {
      atlas.globe.labels.forEach((label, index) => {
        const across = label.size * tilePixels;
        if (across < REGION_FROM_PX || across > REGION_UNTIL_PX) return;
        const [x, y, z] = label.position;
        const at = drawn.project(x, y, z);
        if (!at.facing) return;
        candidates.push({
          key: `region-${index}`,
          text: label.label,
          x: at.x,
          y: at.y,
          priority: -1,
          kind: "region",
        });
      });
    }
    labels = placeLabels(candidates, width, height, LABEL_LIMIT);
  }

  function linesOf(key: string) {
    const lines = atlas.globe.lines.find((l) => l.key === key)!;
    const pairs = decodeArray(lines.pairs);
    const widths = decodeArray(lines.widths) as Uint8Array;
    const p = atlas.planet.positions;
    const segments = new Float32Array(pairs.length * 3);
    for (let i = 0; i < pairs.length; i++)
      segments.set(p.subarray(pairs[i] * 3, pairs[i] * 3 + 3), i * 3);
    return { key, segments, widths, colour: LINE_COLOURS[lines.style] };
  }

  function placeMarks() {
    const roles = readChartTheme().roles;
    return atlas.globe.places.map((place) => ({
      tile: place.tile,
      colour: roles[place.role],
    }));
  }

  onMount(() => {
    let cancelled = false;
    let made: GlobeScene | null = null;
    const observer = new ResizeObserver(() =>
      made?.resize(frame.clientWidth, frame.clientHeight),
    );
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    import("./globeScene")
      .then(({ GlobeScene }) => {
        if (cancelled) return;
        const style = getComputedStyle(document.documentElement);
        const colour = (name: string) =>
          style.getPropertyValue(`--colour-${name}`).trim();
        const base = coloursFor(view, false);
        if (!base) throw new Error("no view to draw");
        made = new GlobeScene(canvas, atlas.planet, base, {
          background: colour("canvas") || "#0e0b10",
          glow: colour("comparison") || "#b79cff",
          selection: colour("accent") || "#f2a93b",
          reducedMotion: motion.matches,
          onPick: (tile) => onselect(tile),
          onChange: relabel,
        });
        for (const lines of atlas.globe.lines)
          made.setLines(linesOf(lines.key));
        made.setPlaces(placeMarks(), shown.places ?? true);
        made.resize(frame.clientWidth, frame.clientHeight);
        observer.observe(frame);
        scene = made;
        ready = true;
      })
      .catch(() => {
        if (!cancelled) onfailed();
      });
    return () => {
      cancelled = true;
      observer.disconnect();
      made?.dispose();
      scene = null;
    };
  });

  $effect(() => {
    const colours = coloursFor(view, false);
    if (scene && colours) scene.setBase(colours);
  });

  $effect(() => {
    scene?.setOverlay(overlay ? coloursFor(overlay, true) : null);
  });

  $effect(() => {
    if (!scene) return;
    for (const lines of atlas.globe.lines)
      scene.showLines(lines.key, shown[lines.key] ?? true);
    scene.showPlaces(shown.places ?? true);
    scene.setEdges(shown.edges ?? true);
    relabel();
  });

  $effect(() => {
    scene?.select(selected);
  });

  $effect(() => {
    if (scene && focus) scene.flyTo(focus.tile);
  });

  function keydown(event: KeyboardEvent) {
    if (!scene) return;
    const moves: Record<string, () => void> = {
      ArrowLeft: () => scene!.turn(-1, 0),
      ArrowRight: () => scene!.turn(1, 0),
      ArrowUp: () => scene!.turn(0, 1),
      ArrowDown: () => scene!.turn(0, -1),
      "+": () => scene!.zoom(true),
      "=": () => scene!.zoom(true),
      "-": () => scene!.zoom(false),
      Enter: () => onselect(scene!.middleTile()),
      " ": () => onselect(scene!.middleTile()),
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      move();
    }
  }
</script>

<div class="globe" bind:this={frame}>
  <!-- An application in ARIA's sense: it takes the arrow keys, + and - and Enter itself, which Svelte's list of
       interactive roles leaves out. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div
    class="surface"
    tabindex="0"
    role="application"
    aria-label={t("atlas-picture", {
      tiles: atlas.globe.tiles,
      places: atlas.globe.places.length,
    })}
    onkeydown={keydown}
  >
    <canvas bind:this={canvas} aria-hidden="true"></canvas>
  </div>
  <div class="labels" aria-hidden="true">
    {#each labels as label (label.key)}
      <span
        class="label {label.kind}"
        style:left={`${label.x}px`}
        style:top={`${label.y}px`}
        style:color={label.colour ?? null}>{label.text}</span
      >
    {/each}
  </div>
  <div class="crosshair" aria-hidden="true"></div>
  {#if !ready}
    <p class="drawing" role="status">{t("atlas-drawing")}</p>
  {/if}
  <div class="controls" role="group" aria-label={t("atlas-controls")}>
    <button
      type="button"
      class="control"
      aria-label={t("atlas-turn-north")}
      title={t("atlas-turn-north")}
      disabled={!ready}
      onclick={() => scene?.turn(0, 1)}>▲</button
    >
    <div class="row">
      <button
        type="button"
        class="control"
        aria-label={t("atlas-turn-west")}
        title={t("atlas-turn-west")}
        disabled={!ready}
        onclick={() => scene?.turn(-1, 0)}>◀</button
      >
      <button
        type="button"
        class="control"
        aria-label={t("atlas-pick-middle")}
        title={t("atlas-pick-middle")}
        disabled={!ready}
        onclick={() => scene && onselect(scene.middleTile())}>◎</button
      >
      <button
        type="button"
        class="control"
        aria-label={t("atlas-turn-east")}
        title={t("atlas-turn-east")}
        disabled={!ready}
        onclick={() => scene?.turn(1, 0)}>▶</button
      >
    </div>
    <button
      type="button"
      class="control"
      aria-label={t("atlas-turn-south")}
      title={t("atlas-turn-south")}
      disabled={!ready}
      onclick={() => scene?.turn(0, -1)}>▼</button
    >
    <div class="row">
      <button
        type="button"
        class="control"
        aria-label={t("atlas-zoom-in")}
        title={t("atlas-zoom-in")}
        disabled={!ready}
        onclick={() => scene?.zoom(true)}>+</button
      >
      <button
        type="button"
        class="control"
        aria-label={t("atlas-zoom-out")}
        title={t("atlas-zoom-out")}
        disabled={!ready}
        onclick={() => scene?.zoom(false)}>−</button
      >
    </div>
    <button
      type="button"
      class="control wide"
      disabled={!ready}
      onclick={() => scene?.reset()}>{t("atlas-whole-planet")}</button
    >
  </div>
</div>

<style>
  .globe {
    position: relative;
    width: 100%;
    height: min(72vh, 760px);
    min-height: 360px;
    overflow: hidden;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .surface {
    width: 100%;
    height: 100%;
  }

  .surface:focus-visible {
    outline: 3px solid var(--colour-accent);
    outline-offset: -3px;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: grab;
    touch-action: none;
  }

  .labels {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .label {
    position: absolute;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    font-size: var(--type-caption);
    font-weight: 600;
    color: var(--colour-text);
    text-shadow:
      0 0 3px #000,
      0 0 2px #000,
      0 1px 1px #000;
  }

  .label.region {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 400;
    font-size: var(--type-small);
    color: var(--colour-text-muted);
    letter-spacing: 0.04em;
  }

  .crosshair {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 14px;
    height: 14px;
    transform: translate(-50%, -50%);
    border: 1px solid var(--colour-text-muted);
    border-radius: 50%;
    opacity: 0.6;
    pointer-events: none;
  }

  .drawing {
    position: absolute;
    left: 16px;
    top: 12px;
    margin: 0;
    color: var(--colour-comparison);
    font-weight: 600;
  }

  .controls {
    position: absolute;
    right: 10px;
    bottom: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px;
    background: color-mix(in srgb, var(--colour-surface) 88%, transparent);
    border: 1px solid var(--colour-line);
    border-radius: 6px;
  }

  .row {
    display: flex;
    gap: 4px;
  }

  .control {
    min-width: 44px;
    min-height: 44px;
    font: inherit;
    font-size: 1.1rem;
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .control.wide {
    padding-inline: 10px;
    font-size: var(--type-small);
  }

  .control:hover:not(:disabled) {
    border-color: var(--colour-comparison);
  }

  .control:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
