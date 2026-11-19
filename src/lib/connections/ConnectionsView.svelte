<script lang="ts">
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import { askConnections } from "./desktopClient";
  import { onMount } from "svelte";
  import { register } from "../shortcuts/registry";
  import {
    curve,
    flowPicture,
    NODE_RADIUS,
    radial,
    shownGroups,
    zoomed,
    type Picture,
    type Placed,
  } from "./layout";
  import {
    FIRST_SHOWN,
    kindMark,
    RELATION_KEYS,
    RELATION_TONES,
    RELATIONS,
    shortLabel,
    whereWords,
  } from "./presentation";
  import type { Around, Flow, Layout, Relation, Thing } from "./types";
  import ThingHistory from "./ThingHistory.svelte";
  import WatchingRows from "./WatchingRows.svelte";
  import PatchBadges from "./PatchBadges.svelte";
  import { openTheirCode } from "../othercode/navigation";
  import { theirName } from "../othercode/presentation";
  import { patchTargetsOf, riskyNodes, type PatchTargets } from "./patches";

  /**
   * How one thing connects: drawn around it (each kind of connection a hub, its members beyond), as a flow of calls from callers on
   * the left to callees on the right, or as a list. Press anything to put it in the middle; Back returns. Works for any game's code
   * in any language the tools read; dashed lines are connections read by name.
   */
  let {
    game,
    repository,
    start,
    changed = new Set<string>(),
    onrecentre,
  }: {
    game: string;
    repository: string;
    start: string;
    changed?: Set<string>;
    /** When given, putting something in the middle is the caller's step (the Code map's trail), not this view's own. */
    onrecentre?: (id: string) => void;
  } = $props();

  type Reading<T> =
    | { state: "reading" }
    | { state: "ready"; data: T }
    | { state: "refused"; reason: string }
    | { state: "failed"; failure: Failure };

  // svelte-ignore state_referenced_locally
  let trail = $state<string[]>([start]);
  let layout = $state<Layout>("radial");
  let shown = $state(new Set<Relation>(FIRST_SHOWN));
  let outside = $state(true);
  let around = $state<Reading<Around>>({ state: "reading" });
  let flow = $state<Reading<Flow>>({ state: "reading" });
  let progress = $state(started());
  let focused = $state<Thing | null>(null);
  let scale = $state(1);
  let pan = $state({ x: 0, y: 0 });
  let dragging: { x: number; y: number; moved: boolean } | null = null;

  const centreId = $derived(trail[trail.length - 1]);
  const centre = $derived(around.state === "ready" ? around.data.centre : null);
  const groups = $derived(
    around.state === "ready"
      ? shownGroups(around.data.groups, shown, outside)
      : [],
  );
  const allGroups = $derived(
    around.state === "ready" ? around.data.groups : [],
  );
  const outsideCount = $derived(
    allGroups.reduce((n, g) => n + g.nodes.filter((x) => x.external).length, 0),
  );
  const picture = $derived<Picture | null>(
    layout === "radial" && around.state === "ready"
      ? radial(around.data, groups)
      : layout === "flow" && flow.state === "ready"
        ? flowPicture(flow.data, outside)
        : null,
  );

  async function load(id: string) {
    around = { state: "reading" };
    flow = { state: "reading" };
    progress = started();
    focused = null;
    const onProgress = (message: Parameters<typeof heard>[1]) => {
      progress = heard(progress, message);
    };
    const asked = await askConnections<Around>(game, repository, "around", id, {
      onProgress,
    });
    around =
      asked.state === "failed"
        ? asked
        : asked.answer.ok
          ? { state: "ready", data: asked.answer.data }
          : { state: "refused", reason: asked.answer.refusal ?? "" };
    if (layout === "flow") await loadFlow(id);
  }

  async function loadFlow(id: string) {
    flow = { state: "reading" };
    const asked = await askConnections<Flow>(game, repository, "flow", id, {
      depth: 2,
    });
    flow =
      asked.state === "failed"
        ? asked
        : asked.answer.ok
          ? { state: "ready", data: asked.answer.data }
          : { state: "refused", reason: asked.answer.refusal ?? "" };
  }

  function recentre(thing: Thing | null) {
    if (!thing || thing.id === centreId) return;
    if (onrecentre) {
      onrecentre(thing.id);
      return;
    }
    trail = [...trail, thing.id];
    pan = { x: 0, y: 0 };
  }

  function back() {
    if (trail.length > 1) trail = trail.slice(0, -1);
  }

  function choose(next: Layout) {
    layout = next;
    if (next === "flow" && flow.state !== "ready") void loadFlow(centreId);
  }

  function toggle(relation: Relation) {
    const next = new Set(shown);
    if (next.has(relation)) next.delete(relation);
    else next.add(relation);
    shown = next;
  }

  function count(relation: Relation) {
    return allGroups.find((g) => g.relation === relation)?.count ?? 0;
  }

  function relationWords(relation: Relation | null) {
    return relation ? t(RELATION_KEYS[relation]) : "";
  }

  function nodeLabel(node: Placed) {
    const thing = node.thing!;
    const label = t("connections-node-label", {
      name: thing.name,
      kind: thing.kind,
      where: whereWords(thing) || t("connections-nowhere"),
      relation: relationWords(node.relation),
      exact: thing.exact === false ? "no" : "yes",
    });
    return risky.has(thing.id) ? `${label} ${t("patches-risk-mark")}` : label;
  }

  /** The methods this repository patches, from the game's tools where they can say (cross-links L5); null until read. */
  let patchTargets = $state<PatchTargets | null>(null);
  const risky = $derived(riskyNodes(patchTargets?.data?.targets ?? []));
  $effect(() => {
    void patchTargetsOf(game, repository).then(
      (found) => (patchTargets = found),
    );
  });

  function pressed(event: KeyboardEvent, action: () => void) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  }

  function startDrag(event: PointerEvent) {
    if ((event.target as Element).closest(".node")) return;
    dragging = { x: event.clientX, y: event.clientY, moved: false };
  }

  function drag(event: PointerEvent) {
    if (!dragging) return;
    const dx = event.clientX - dragging.x;
    const dy = event.clientY - dragging.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true;
    pan = { x: pan.x + dx / scale, y: pan.y + dy / scale };
    dragging.x = event.clientX;
    dragging.y = event.clientY;
  }

  function wheel(event: WheelEvent) {
    event.preventDefault();
    scale = zoomed(scale, event.deltaY < 0 ? 1 : -1);
  }

  $effect(() => {
    void load(centreId);
  });

  let frame: HTMLDivElement;

  onMount(() =>
    register({
      scope: "connections",
      inDialog: frame.closest("dialog") !== null,
      run: {
        "connections.around": () => choose("radial"),
        "connections.flow": () => choose("flow"),
        "connections.list": () => choose("list"),
        "connections.zoom-in": () => (scale = zoomed(scale, 1)),
        "connections.zoom-out": () => (scale = zoomed(scale, -1)),
        "connections.fit": () => {
          scale = 1;
          pan = { x: 0, y: 0 };
        },
        "connections.back": back,
      },
    }),
  );
</script>

<div class="connections" bind:this={frame}>
  <div class="controls">
    <div
      class="toggles"
      role="group"
      aria-label={t("connections-layout-label")}
    >
      {#each [["radial", "connections-layout-radial"], ["flow", "connections-layout-flow"], ["list", "connections-layout-list"]] as [value, key] (value)}
        <button
          type="button"
          class="toggle"
          aria-pressed={layout === value}
          onclick={() => choose(value as Layout)}>{t(key)}</button
        >
      {/each}
    </div>
    {#if layout !== "list"}
      <div
        class="toggles"
        role="group"
        aria-label={t("connections-zoom-label")}
      >
        <button
          type="button"
          class="action"
          onclick={() => (scale = zoomed(scale, -1))}
          >{t("connections-zoom-out")}</button
        >
        <button
          type="button"
          class="action"
          onclick={() => (scale = zoomed(scale, 1))}
          >{t("connections-zoom-in")}</button
        >
        <button
          type="button"
          class="action"
          onclick={() => {
            scale = 1;
            pan = { x: 0, y: 0 };
          }}>{t("connections-zoom-fit")}</button
        >
      </div>
    {/if}
    {#if trail.length > 1}
      <button type="button" class="action" onclick={back}>
        {t("connections-back")}
      </button>
    {/if}
  </div>

  <div class="layout">
    <div class="stage-area">
      {#if around.state === "reading"}
        <ProgressBar {progress} fallback={t("connections-loading")} />
      {:else if around.state === "failed"}
        <FailurePanel failure={around.failure} onretry={() => load(centreId)} />
      {:else if around.state === "refused"}
        <p class="lead">
          {t("connections-refused", { reason: around.reason })}
        </p>
      {:else if centre}
        <h3 class="centre-title">
          <span class="mark-letter" aria-hidden="true">{kindMark(centre)}</span>
          {centre.name}
          <span class="muted small">
            {centre.kind} · {whereWords(centre) || t("connections-nowhere")}
            {#if changed.has(centre.id)}· {t("connections-changed-mark")}{/if}
          </span>
        </h3>
        {#if layout === "list"}
          {#if groups.length === 0}
            <p class="muted">{t("connections-none", { name: centre.name })}</p>
          {/if}
          {#each groups as group (group.relation)}
            <section
              class="list-group"
              aria-label={relationWords(group.relation)}
            >
              <h4>
                <span
                  class="swatch tone-{RELATION_TONES[group.relation]}"
                  aria-hidden="true"
                ></span>
                {relationWords(group.relation)}: {group.count}
                {#if !group.exact}<span class="muted small"
                    >{t("connections-some-by-name")}</span
                  >{/if}
              </h4>
              <ul>
                {#each group.nodes as thing (thing.id)}
                  <li>
                    <button
                      type="button"
                      class="thing-button"
                      onclick={() => recentre(thing)}
                    >
                      <span class="mark-letter" aria-hidden="true"
                        >{kindMark(thing)}</span
                      >
                      <span class="thing-name">{thing.name}</span>
                      <span class="muted small"
                        >{thing.kind} · {whereWords(thing) ||
                          t("connections-nowhere")}{thing.exact === false
                          ? ` · ${t("connections-by-name-short")}`
                          : ""}</span
                      >
                    </button>
                  </li>
                {/each}
                {#if group.count > group.nodes.length}
                  <li class="muted small">
                    {t("connections-more", {
                      count: group.count - group.nodes.length,
                    })}
                  </li>
                {/if}
              </ul>
            </section>
          {/each}
        {:else if layout === "flow" && flow.state === "reading"}
          <ProgressBar
            progress={started()}
            fallback={t("connections-loading")}
          />
        {:else if layout === "flow" && flow.state === "failed"}
          <FailurePanel
            failure={flow.failure}
            onretry={() => loadFlow(centreId)}
          />
        {:else if layout === "flow" && flow.state === "refused"}
          <p class="lead">
            {t("connections-refused", { reason: flow.reason })}
          </p>
        {:else if picture}
          {#if layout === "flow" && picture.nodes.length <= 1}
            <p class="muted">
              {t("connections-flow-none", { name: centre.name })}
            </p>
          {:else if layout === "radial" && groups.length === 0}
            <p class="muted">{t("connections-none", { name: centre.name })}</p>
          {/if}
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <svg
            class="stage"
            viewBox={`0 0 ${picture.width} ${picture.height}`}
            role="group"
            aria-label={layout === "flow"
              ? t("connections-flow-label", { name: centre.name })
              : t("connections-picture-label", { name: centre.name })}
            onpointerdown={startDrag}
            onpointermove={drag}
            onpointerup={() => (dragging = null)}
            onpointerleave={() => (dragging = null)}
            onwheel={wheel}
          >
            <g
              transform={`translate(${picture.width / 2 + pan.x * scale} ${picture.height / 2 + pan.y * scale}) scale(${scale}) translate(${-picture.width / 2} ${-picture.height / 2})`}
            >
              {#each picture.lines as line (line.key)}
                <path
                  class="line tone-{line.relation
                    ? RELATION_TONES[line.relation]
                    : 'muted'}"
                  class:guess={!line.exact}
                  d={layout === "flow"
                    ? curve(line)
                    : `M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`}
                />
              {/each}
              {#each picture.nodes as node (node.key)}
                {#if node.role === "hub"}
                  <g
                    class="hub tone-{RELATION_TONES[node.relation!]}"
                    transform={`translate(${node.x} ${node.y})`}
                  >
                    <circle r="30" />
                    <text class="hub-count" dy="5">{node.count}</text>
                    <text class="hub-label" dy="48"
                      >{relationWords(node.relation)}</text
                    >
                  </g>
                {:else if node.role === "more"}
                  <g
                    class="node more"
                    transform={`translate(${node.x} ${node.y})`}
                    role="button"
                    tabindex="0"
                    aria-label={t("connections-more-label", {
                      count: node.count,
                      relation: relationWords(node.relation),
                    })}
                    onclick={() => choose("list")}
                    onkeydown={(e) => pressed(e, () => choose("list"))}
                  >
                    <circle r={NODE_RADIUS} />
                    <text class="mark-text" dy="5">+{node.count}</text>
                  </g>
                {:else if node.thing}
                  {@const thing = node.thing}
                  <g
                    class="node {node.role}"
                    class:external={thing.external}
                    class:changed={changed.has(thing.id)}
                    transform={`translate(${node.x} ${node.y})`}
                    role="button"
                    tabindex="0"
                    aria-label={node.role === "centre"
                      ? t("connections-centre-label", {
                          name: thing.name,
                          kind: thing.kind,
                          count: centre.connections ?? 0,
                        })
                      : nodeLabel(node)}
                    onclick={() => {
                      if (!dragging?.moved) recentre(thing);
                    }}
                    onkeydown={(e) => pressed(e, () => recentre(thing))}
                    onfocus={() => (focused = thing)}
                    onpointerenter={() => (focused = thing)}
                  >
                    {#if changed.has(thing.id)}<circle
                        class="changed-ring"
                        r={NODE_RADIUS + 7}
                      />{/if}
                    {#if risky.has(thing.id)}<circle
                        class="risk-ring"
                        r={NODE_RADIUS + 12}
                      />{/if}
                    <circle
                      class="tone-{node.relation
                        ? RELATION_TONES[node.relation]
                        : 'accent'}"
                      r={node.role === "centre" ? NODE_RADIUS + 8 : NODE_RADIUS}
                    />
                    <text class="mark-text" dy="6">{kindMark(thing)}</text>
                    <text class="label" dy={node.role === "centre" ? 52 : 42}
                      >{shortLabel(thing)}</text
                    >
                  </g>
                {/if}
              {/each}
            </g>
          </svg>
          <p class="muted small">{t("connections-hint")}</p>
          {#if risky.size > 0}
            <p class="muted small">{t("patches-ring-hint")}</p>
          {/if}
        {/if}
      {/if}
    </div>

    <aside class="side" aria-label={t("connections-filters-label")}>
      <h4>{t("connections-filters-label")}</h4>
      <div class="filters">
        {#each RELATIONS.filter((r) => count(r) > 0) as relation (relation)}
          <button
            type="button"
            class="toggle filter"
            aria-pressed={shown.has(relation)}
            onclick={() => toggle(relation)}
          >
            <span
              class="swatch tone-{RELATION_TONES[relation]}"
              aria-hidden="true"
            ></span>
            {relationWords(relation)}
            <span class="filter-count">{count(relation)}</span>
          </button>
        {/each}
      </div>
      {#if outsideCount > 0}
        <button
          type="button"
          class="toggle filter"
          aria-pressed={outside}
          onclick={() => (outside = !outside)}
        >
          {t("connections-outside", { count: outsideCount })}
        </button>
      {/if}
      {#if focused}
        <h4>{t("connections-details-title")}</h4>
        <p class="detail-name">{focused.name}</p>
        <p class="small">{focused.kind} · {focused.language}</p>
        <p class="small where">
          {whereWords(focused) || t("connections-nowhere")}
        </p>
        <p class="small">
          {focused.exact === false
            ? t("connections-by-name")
            : t("connections-exact")}
        </p>
        {#if focused.connections !== undefined}
          <p class="small">
            {t("connections-count", { count: focused.connections })}
          </p>
        {/if}
        {#if focused.external && theirName(focused.id)}
          <button
            type="button"
            class="action"
            onclick={() =>
              openTheirCode(game, repository, theirName(focused!.id) ?? "")}
            >{t("their-open")}</button
          >
        {/if}
        {#if focused.id !== centreId}
          <button
            type="button"
            class="action"
            onclick={() => recentre(focused)}
          >
            {t("connections-centre")}
          </button>
        {/if}
      {/if}
    </aside>
  </div>
  {#if centre && !centre.external && centre.file}
    <PatchBadges
      targets={patchTargets}
      node={centre.id}
      name={centre.name}
      {game}
      {repository}
    />
    <WatchingRows {game} {repository} node={centre.id} name={centre.name} />
    <ThingHistory {game} {repository} node={centre.id} name={centre.name} />
  {/if}
</div>

<style>
  .connections {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
    gap: 14px;
    min-height: 0;
  }

  @media (max-width: 760px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .stage-area {
    min-width: 0;
  }

  .centre-title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    margin: 0 0 6px;
    font-size: var(--type-body);
    overflow-wrap: anywhere;
  }

  .stage {
    display: block;
    width: 100%;
    height: auto;
    max-height: 74vh;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: grab;
    touch-action: none;
  }

  .line {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    opacity: 0.75;
  }

  .line.guess {
    stroke-dasharray: 6 5;
  }

  .hub circle {
    fill: var(--colour-surface-soft);
    stroke: currentColor;
    stroke-width: 3;
  }

  .hub-count {
    fill: var(--colour-text);
    font-size: 16px;
    font-weight: 600;
    text-anchor: middle;
  }

  .hub-label {
    fill: currentColor;
    font-size: 15px;
    font-weight: 600;
    text-anchor: middle;
  }

  .node {
    cursor: pointer;
  }

  .node circle {
    fill: var(--colour-surface);
    stroke: currentColor;
    stroke-width: 2.5;
  }

  .node.centre circle {
    stroke: var(--colour-accent);
    stroke-width: 4;
  }

  .node.external circle {
    stroke-dasharray: 4 3;
  }

  .node .risk-ring {
    fill: none;
    stroke: var(--colour-risk);
    stroke-width: 3;
    stroke-dasharray: 3 4;
  }

  .node .changed-ring {
    fill: none;
    stroke: var(--colour-accent);
    stroke-width: 3;
  }

  .node:focus-visible {
    outline: none;
  }

  .node:focus-visible circle,
  .node:hover circle {
    stroke-width: 5;
  }

  .mark-text {
    fill: var(--colour-text);
    font-size: 16px;
    font-weight: 600;
    text-anchor: middle;
    pointer-events: none;
  }

  .label {
    fill: var(--colour-text);
    font-size: 14px;
    text-anchor: middle;
    pointer-events: none;
  }

  .more circle {
    stroke: var(--colour-text-muted);
    stroke-dasharray: 3 3;
  }

  .tone-observed {
    color: var(--colour-observed);
  }

  .tone-comparison {
    color: var(--colour-comparison);
  }

  .tone-success {
    color: var(--colour-success);
  }

  .tone-risk {
    color: var(--colour-risk);
  }

  .tone-accent {
    color: var(--colour-accent);
  }

  .tone-muted {
    color: var(--colour-text-muted);
  }

  .swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: currentColor;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .side h4,
  .list-group h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0 2px;
    font-size: var(--type-small);
    font-weight: 600;
  }

  .side p {
    margin: 0;
  }

  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
  }

  .filter {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-inline: 8px;
    font-size: var(--type-small);
    text-align: start;
  }

  .filter-count {
    margin-inline-start: auto;
    font-variant-numeric: tabular-nums;
  }

  .detail-name {
    font-weight: 600;
  }

  .mark-letter {
    display: inline-grid;
    place-items: center;
    width: 1.6em;
    height: 1.6em;
    font-size: var(--type-small);
    font-weight: 600;
    border: 1px solid var(--colour-line);
    border-radius: 50%;
  }

  .list-group ul {
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .thing-button {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    width: 100%;
    min-height: var(--control-min);
    padding: 4px 10px;
    font: inherit;
    color: var(--colour-text);
    text-align: start;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  .thing-name {
    font-weight: 600;
  }
</style>
