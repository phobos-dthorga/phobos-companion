<script lang="ts">
  /*
   * A globe block from the kit: the planet, a choice of views, what to show over it, a key, the picked tile's details
   * and every place in a list. Everything the globe does can be done with buttons; dragging is only a shortcut.
   */
  import { t } from "../i18n/runtime";
  import { countValues, keyEntries, RAMPS } from "./colours";
  import GlobeView from "./GlobeView.svelte";
  import {
    firstView,
    homePlace,
    overlaysOf,
    placeGroups,
    readAtlas,
    tileDetails,
    viewsOf,
  } from "./presentation";
  import type { GlobeBlockData, GlobePlaceData } from "./types";

  let { globe }: { globe: GlobeBlockData } = $props();

  const atlas = $derived(readAtlas(globe));
  const views = $derived(viewsOf(globe));
  const overlays = $derived(overlaysOf(globe));

  let chosenView = $state<string | null>(null);
  let overlayOn = $state(true);
  let shown = $state<Record<string, boolean>>({
    places: true,
    regions: true,
    edges: true,
  });
  let selected = $state<number | null>(null);
  let focus = $state<{ tile: number; request: number } | null>(null);
  let filter = $state("");
  let failed = $state(false);
  let requests = 0;

  const view = $derived(chosenView ?? firstView(globe)?.key ?? "");
  const viewLayer = $derived(globe.layers.find((l) => l.key === view) ?? null);
  const overlay = $derived(overlayOn ? (overlays[0]?.key ?? null) : null);
  const key = $derived(
    viewLayer
      ? keyEntries(viewLayer, countValues(atlas.values.get(viewLayer.key)!))
      : [],
  );
  const overlayKey = $derived(overlays[0] ? keyEntries(overlays[0]) : []);
  const details = $derived(
    selected === null ? [] : tileDetails(atlas, selected),
  );
  const placesHere = $derived(
    selected === null ? [] : (atlas.placesAt.get(selected) ?? []),
  );
  const groups = $derived(placeGroups(globe.places, filter));
  const home = $derived(homePlace(globe.places));
  const gradient = $derived(
    viewLayer?.kind === "measure"
      ? `linear-gradient(to right, ${RAMPS[viewLayer.ramp].map((s) => s.colour).join(", ")})`
      : "",
  );

  function goTo(place: GlobePlaceData) {
    selected = place.tile;
    focus = { tile: place.tile, request: ++requests };
  }

  function toggle(name: string) {
    shown = { ...shown, [name]: !(shown[name] ?? true) };
  }
</script>

<figure class="atlas">
  <figcaption>
    <strong>{globe.title}</strong>
    <span class="muted">{globe.description}</span>
  </figcaption>

  <div class="bar" role="group" aria-label={t("atlas-views")}>
    <span class="bar-label muted">{t("atlas-views")}</span>
    {#each views as layer (layer.key)}
      <button
        type="button"
        class="chip"
        aria-pressed={layer.key === view}
        title={layer.description}
        onclick={() => (chosenView = layer.key)}>{layer.label}</button
      >
    {/each}
  </div>

  <div class="bar" role="group" aria-label={t("atlas-show")}>
    <span class="bar-label muted">{t("atlas-show")}</span>
    {#each overlays as layer (layer.key)}
      <button
        type="button"
        class="chip"
        aria-pressed={overlayOn}
        title={layer.description}
        onclick={() => (overlayOn = !overlayOn)}>{layer.label}</button
      >
    {/each}
    {#each globe.lines as lines (lines.key)}
      <button
        type="button"
        class="chip"
        aria-pressed={shown[lines.key] ?? true}
        title={lines.description}
        onclick={() => toggle(lines.key)}>{lines.label}</button
      >
    {/each}
    <button
      type="button"
      class="chip"
      aria-pressed={shown.places}
      onclick={() => toggle("places")}>{t("atlas-show-places")}</button
    >
    <button
      type="button"
      class="chip"
      aria-pressed={shown.regions}
      onclick={() => toggle("regions")}>{t("atlas-show-regions")}</button
    >
    <button
      type="button"
      class="chip"
      aria-pressed={shown.edges}
      onclick={() => toggle("edges")}>{t("atlas-show-edges")}</button
    >
    {#if home}
      <button type="button" class="chip go" onclick={() => goTo(home!)}
        >{t("atlas-go-home", { place: home.label })}</button
      >
    {/if}
  </div>

  {#if failed}
    <p class="failed" role="alert">{t("atlas-failed")}</p>
  {:else}
    <GlobeView
      {atlas}
      {view}
      {overlay}
      {shown}
      {selected}
      {focus}
      onselect={(tile) => (selected = tile)}
      onfailed={() => (failed = true)}
    />
    <p class="hint muted">{t("atlas-hint")}</p>
  {/if}

  <div class="panels">
    <section class="panel" aria-labelledby="atlas-key-heading">
      <h3 id="atlas-key-heading">
        {t("atlas-key", { view: viewLayer?.label ?? "" })}
      </h3>
      {#if viewLayer?.kind === "measure"}
        <div
          class="gradient"
          style:background={gradient}
          aria-hidden="true"
        ></div>
      {/if}
      <ul class="key">
        {#each key as entry (entry.label)}
          <li>
            <span class="swatch" style:background={entry.colour}
            ></span>{entry.label}
          </li>
        {/each}
      </ul>
      {#if overlay && overlays[0]}
        <h4>{overlays[0].label}</h4>
        <ul class="key">
          {#each overlayKey as entry (entry.label)}
            <li>
              <span class="swatch" style:background={entry.colour}
              ></span>{entry.label}
              {#if entry.note}<span class="muted">{entry.note}</span>{/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if globe.lines.length}
        <h4>{t("atlas-lines")}</h4>
        <ul class="key">
          {#each globe.lines as lines (lines.key)}
            <li><span class="stroke {lines.style}"></span>{lines.label}</li>
          {/each}
        </ul>
      {/if}
    </section>

    <section
      class="panel"
      aria-labelledby="atlas-tile-heading"
      aria-live="polite"
    >
      <h3 id="atlas-tile-heading">{t("atlas-tile")}</h3>
      {#if selected === null}
        <p class="muted">{t("atlas-tile-none")}</p>
      {:else}
        {#each placesHere as place, index (index)}
          <p class="place-here">
            <strong>{place.label}</strong>
            <span class="muted"
              >{place.kind}{place.detail ? `, ${place.detail}` : ""}</span
            >
          </p>
        {/each}
        <dl>
          {#each details as detail (detail.label)}
            <dt>{detail.label}</dt>
            <dd>{detail.value}</dd>
          {/each}
        </dl>
      {/if}
    </section>
  </div>

  <section class="panel places" aria-labelledby="atlas-places-heading">
    <h3 id="atlas-places-heading">
      {t("atlas-places", { count: globe.places.length })}
    </h3>
    <label class="filter">
      <span>{t("atlas-filter")}</span>
      <input type="search" bind:value={filter} />
    </label>
    {#each groups as group (group.group)}
      <details open={group.places.some((p) => p.priority >= 30)}>
        <summary
          >{group.group}
          <span class="muted">({group.places.length})</span></summary
        >
        <ul class="place-list">
          {#each group.places as place, index (`${place.tile}-${place.label}-${index}`)}
            <li>
              <button type="button" class="place" onclick={() => goTo(place)}>
                <span>{place.label}</span>
                <span class="muted"
                  >{place.kind}{place.detail ? `, ${place.detail}` : ""}</span
                >
              </button>
            </li>
          {/each}
        </ul>
      </details>
    {/each}
    {#if groups.length === 0}
      <p class="muted">{t("atlas-places-none")}</p>
    {/if}
  </section>
</figure>

<style>
  .atlas {
    margin: 0;
  }

  figcaption {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-bottom: 10px;
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  .bar-label {
    min-width: 4.5em;
    font-size: var(--type-small);
  }

  .chip {
    min-height: 44px;
    padding: 6px 12px;
    font: inherit;
    font-size: var(--type-small);
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 999px;
    cursor: pointer;
  }

  .chip[aria-pressed="true"] {
    color: var(--colour-canvas);
    background: var(--colour-comparison);
    border-color: var(--colour-comparison);
    font-weight: 600;
  }

  .chip.go {
    border-color: var(--colour-accent);
  }

  .chip:hover {
    border-color: var(--colour-comparison);
  }

  .hint {
    margin: 6px 0 0;
    font-size: var(--type-small);
  }

  .failed {
    padding: 12px 16px;
    color: var(--colour-risk);
    border: 1px solid var(--colour-risk);
    border-radius: 4px;
  }

  .panels {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  .panel {
    padding: 12px 16px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .panel h3 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .panel h4 {
    margin: 12px 0 6px;
    font-size: var(--type-small);
  }

  .gradient {
    height: 12px;
    margin-bottom: 8px;
    border-radius: 2px;
  }

  .key {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 4px 12px;
    font-size: var(--type-small);
  }

  .key li {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .swatch {
    flex: none;
    width: 14px;
    height: 14px;
    border: 1px solid var(--colour-line);
    border-radius: 2px;
  }

  .stroke {
    flex: none;
    width: 18px;
    height: 3px;
    border-radius: 2px;
  }

  .stroke.river {
    background: #5fa8e8;
  }

  .stroke.road {
    background: #d9c38f;
  }

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 12px;
    margin: 0;
  }

  dt {
    color: var(--colour-text-muted);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .place-here {
    margin: 0 0 8px;
  }

  .places {
    margin-top: 12px;
  }

  .filter {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .filter input {
    min-height: 44px;
    min-width: min(100%, 280px);
    padding: 6px 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-weight: 600;
  }

  .place-list {
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
    gap: 6px;
  }

  .place {
    width: 100%;
    min-height: 44px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 6px 10px;
    font: inherit;
    font-size: var(--type-small);
    text-align: start;
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .place:hover {
    border-color: var(--colour-comparison);
  }
</style>
