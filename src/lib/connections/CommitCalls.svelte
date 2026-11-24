<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import {
    callRows,
    callsPicture,
    estimate,
    methodsFor,
    ringPicture,
    ringWords,
    type CallRow,
    type CallsView,
    type Measure,
  } from "./calls";
  import { askCalls } from "./desktopClient";
  import type { Calls, RingStep } from "./types";

  /**
   * What a commit did to its methods' calls (0.82.0; kit 1.116.0): the rings of calls it made or cut, and the calls of the thing
   * chosen in the picture above, gone, new and kept, before the commit, after it, or the change. Each state is a line's style and
   * a word, never colour alone. Pressing a call of ours puts it in the middle of the picture.
   */
  let {
    game,
    repository,
    commit,
    chosen,
    onchoose,
  }: {
    game: string;
    repository: string;
    commit: string;
    chosen: string | null;
    onchoose: (node: string) => void;
  } = $props();

  let reading = $state<
    | { state: "reading" }
    | { state: "ready"; calls: Calls }
    | { state: "refused"; reason: string }
    | { state: "failed"; failure: Failure }
  >({ state: "reading" });
  let progress = $state(started());
  let view = $state<CallsView>("change");

  const VIEWS: [CallsView, string][] = [
    ["before", "calls-view-before"],
    ["after", "calls-view-after"],
    ["change", "calls-view-change"],
  ];
  const STATE_WORDS: Record<CallRow["state"], string> = {
    gone: "calls-state-gone",
    new: "calls-state-new",
    kept: "calls-state-kept",
  };
  const STATUS_WORDS: Record<"changed" | "added" | "removed", string> = {
    changed: "calls-status-changed",
    added: "calls-status-added",
    removed: "calls-status-removed",
  };
  const RING_WORDS = {
    cut: { caption: "calls-ring-cut", word: "calls-ring-word-cut" },
    made: { caption: "calls-ring-made", word: "calls-ring-word-made" },
  };

  const calls = $derived(reading.state === "ready" ? reading.calls : null);
  const shown = $derived(calls ? methodsFor(calls, chosen).slice(0, 6) : []);
  const changedKeys = $derived(
    new Set(calls ? calls.methods.map((m) => m.key) : []),
  );
  const others = $derived(
    calls
      ? calls.methods.filter((m) => m.node && !shown.includes(m)).slice(0, 12)
      : [],
  );

  async function load() {
    reading = { state: "reading" };
    progress = started();
    const asked = await askCalls(game, repository, commit, (message) => {
      progress = heard(progress, message);
    });
    reading =
      asked.state === "failed"
        ? asked
        : asked.answer.ok
          ? { state: "ready", calls: asked.answer.data }
          : { state: "refused", reason: asked.answer.refusal ?? "" };
  }

  /**
   * Text widths measured with the page's own font (0.83.1), so each picture is sized to what it holds; a rough estimate where the
   * window cannot measure. A few pixels over, so a name never touches an edge.
   */
  const measure: Measure = (() => {
    const context =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
    if (!context) return estimate;
    const family = getComputedStyle(document.body).fontFamily || "sans-serif";
    return (text, size, bold = false) => {
      context.font = `${bold ? 600 : 400} ${size}px ${family}`;
      return context.measureText(text).width + 4;
    };
  })();
  const STATE_TEXT = $derived(
    (["gone", "new", "kept"] as const).map((state) => t(STATE_WORDS[state])),
  );

  /** A row's second line: where the call goes, and how. */
  function rowNote(row: CallRow): string {
    return [
      row.outside ? t("calls-outside", { assembly: row.assembly ?? "" }) : "",
      row.viaBase ? t("calls-via-base") : "",
      row.movedTo ? t("calls-moved-to", { name: row.movedTo }) : "",
      row.movedFrom ? t("calls-moved-from", { name: row.movedFrom }) : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function rowWords(row: CallRow): string {
    const parts = [t(STATE_WORDS[row.state]), row.display];
    if (row.outside)
      parts.push(t("calls-outside", { assembly: row.assembly ?? "" }));
    if (row.viaBase) parts.push(t("calls-via-base"));
    if (row.movedTo) parts.push(t("calls-moved-to", { name: row.movedTo }));
    if (row.movedFrom)
      parts.push(t("calls-moved-from", { name: row.movedFrom }));
    return parts.join(", ");
  }

  function ringCaption(kind: "made" | "cut", ring: RingStep[]): string {
    return t(RING_WORDS[kind].caption, {
      ring: ringWords(ring, t("calls-game")),
    });
  }

  onMount(load);
</script>

<section class="calls" aria-label={t("calls-title")}>
  <h4>{t("calls-title")}</h4>
  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("calls-loading")} />
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={load} />
  {:else if reading.state === "refused"}
    <p class="muted small">
      {t("connections-refused", { reason: reading.reason })}
    </p>
  {:else if calls}
    {#if calls.rings.cut.length === 0 && calls.rings.made.length === 0}
      <p class="small">{t("calls-rings-none")}</p>
    {/if}
    {#each [["cut", calls.rings.cut], ["made", calls.rings.made]] as [kind, rings] (kind)}
      {#each rings as ring, index (`${kind}-${index}`)}
        {@const picture = ringPicture(ring as RingStep[], changedKeys, {
          gameWord: t("calls-game"),
          measure,
        })}
        {@const caption = ringCaption(
          kind as "made" | "cut",
          ring as RingStep[],
        )}
        <figure class="ring {kind}">
          <svg
            width={picture.width}
            height={picture.height}
            viewBox={`0 0 ${picture.width} ${picture.height}`}
            role="img"
            aria-label={caption}
          >
            {#each picture.arrows as line, i (i)}
              <line
                class="ring-line"
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
              />
              <polygon class="ring-head" points={line.head} />
            {/each}
            {#if picture.loop}<path class="ring-line" d={picture.loop} />{/if}
            {#each picture.steps as step (step.key)}
              <circle
                class="step"
                class:changed={step.changed}
                class:outside={step.outside}
                cx={step.x}
                cy={step.y}
                r="9"
              />
              <text
                class="step-label"
                x={step.labelX}
                y={step.labelY}
                text-anchor={step.anchor}>{step.label}</text
              >
            {/each}
            <text class="ring-word" x={picture.cx} y={picture.cy + 5}
              >{t(RING_WORDS[kind as "cut" | "made"].word)}</text
            >
          </svg>
          <figcaption class="small">{caption}</figcaption>
        </figure>
      {/each}
    {/each}
    {#if calls.rings.made.length > 0}
      <p class="muted small">{t("calls-ring-judge")}</p>
    {/if}
    {#if calls.rings.standing.length > 0}
      <p class="muted small">
        {t("calls-rings-standing", { count: calls.rings.standing.length })}
      </p>
    {/if}

    {#if calls.methods.length === 0}
      <p class="small">{t("calls-none")}</p>
    {:else}
      <div class="toggles" role="group" aria-label={t("calls-view-label")}>
        {#each VIEWS as [each, words] (each)}
          <button
            type="button"
            class="toggle"
            aria-pressed={view === each}
            onclick={() => (view = each)}>{t(words)}</button
          >
        {/each}
      </div>
      {#if shown.length === 0}
        <p class="small">{t("calls-chosen-unchanged")}</p>
      {/if}
      {#each shown as method (method.key)}
        {@const rows = callRows(method, view)}
        {@const picture = callsPicture(rows, {
          label: method.display.split(".").pop() ?? method.display,
          notes: rows.map(rowNote),
          words: STATE_TEXT,
          measure,
        })}
        <figure class="method">
          <figcaption>
            <strong>{method.display}</strong>
            <span class="muted small">
              {t(STATUS_WORDS[method.status])} · {method.file}:{method.line}</span
            >
          </figcaption>
          {#if rows.length === 0}
            <p class="muted small">{t("calls-method-none")}</p>
          {:else}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
              class="scroll"
              tabindex="0"
              role="group"
              aria-label={t("calls-method-label", { name: method.display })}
            >
              <svg
                width={picture.width}
                height={picture.height}
                viewBox={`0 0 ${picture.width} ${picture.height}`}
              >
                <rect
                  class="box"
                  x={picture.box.x}
                  y={picture.box.y}
                  width={picture.box.width}
                  height={picture.box.height}
                  rx="4"
                />
                <text
                  class="box-label"
                  x={picture.box.x + picture.box.width / 2}
                  y={picture.box.y + picture.box.height / 2 + 5}
                  >{#if picture.full}<title>{picture.full}</title
                    >{/if}{picture.label}</text
                >
                {#each picture.rows as row (row.key + row.state)}
                  <g class="call {row.state}">
                    <line
                      class="call-line"
                      x1={row.line.x1}
                      y1={row.line.y1}
                      x2={row.line.x2}
                      y2={row.line.y2}
                    />
                    <polygon class="call-head" points={row.line.head} />
                    <text class="call-word" x={picture.wordX} y={row.y + 5}
                      >{t(STATE_WORDS[row.state])}</text
                    >
                    {#if row.node && !row.outside && row.state !== "gone"}
                      <g
                        class="press"
                        role="button"
                        tabindex="0"
                        aria-label={t("calls-centre", { name: row.display })}
                        onclick={() => onchoose(row.node!)}
                        onkeydown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onchoose(row.node!);
                          }
                        }}
                      >
                        <text
                          class="call-name link"
                          x={picture.nameX}
                          y={row.y + 5}>{row.display}</text
                        >
                      </g>
                    {:else}
                      <text class="call-name" x={picture.nameX} y={row.y + 5}
                        >{row.display}</text
                      >
                    {/if}
                    <text class="call-note" x={picture.nameX} y={row.y + 18}
                      >{row.note}</text
                    >
                  </g>
                {/each}
              </svg>
            </div>
            <ul class="sr-only">
              {#each rows as row (row.key + row.state)}
                <li>{rowWords(row)}</li>
              {/each}
            </ul>
          {/if}
        </figure>
      {/each}
      {#if others.length > 0}
        <div class="others">
          <span class="muted small">{t("calls-others")}</span>
          <div class="toggles" role="group" aria-label={t("calls-others")}>
            {#each others as method (method.key)}
              <button
                type="button"
                class="toggle"
                onclick={() => onchoose(method.node!)}>{method.display}</button
              >
            {/each}
          </div>
        </div>
      {/if}
    {/if}
    {#if calls.gameRead.length > 0}
      <p class="muted small">
        {t("calls-game-read", { assemblies: calls.gameRead.join(", ") })}
      </p>
    {/if}
    {#each calls.limits as limit (limit)}
      <p class="muted small">{limit}</p>
    {/each}
  {/if}
</section>

<style>
  .calls {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 14px;
    min-width: 0;
  }

  .calls h4 {
    margin: 0;
  }

  figure {
    margin: 0;
    min-width: 0;
  }

  /* Drawn at the page's own size, never stretched to fill the window (0.83.1): a method's calls scroll sideways when wide; a
     ring, which has nothing to press, shrinks to fit a narrow window instead. */
  figure svg {
    display: block;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .ring svg {
    max-width: 100%;
    height: auto;
  }

  .scroll {
    overflow-x: auto;
  }

  .scroll:focus-visible {
    outline: 2px solid var(--colour-accent);
    outline-offset: 2px;
  }

  .ring-line,
  .call-line {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
  }

  .ring-head,
  .call-head {
    fill: currentColor;
  }

  /* A ring cut is drawn dashed, one made solid and heavy: told by line and word, the colour only helps. */
  .ring.cut {
    color: var(--colour-success);
  }

  .ring.cut .ring-line {
    stroke-dasharray: 6 5;
  }

  .ring.made {
    color: var(--colour-risk);
  }

  .ring.made .ring-line {
    stroke-width: 3;
  }

  .step {
    fill: var(--colour-surface);
    stroke: var(--colour-text);
    stroke-width: 2;
  }

  .step.changed {
    stroke: var(--colour-accent);
    stroke-width: 4;
  }

  .step.outside {
    stroke-dasharray: 3 3;
  }

  .step-label,
  .box-label,
  .call-name {
    fill: var(--colour-text);
    font-size: 13px;
  }

  .box-label {
    text-anchor: middle;
    font-weight: 600;
  }

  .ring-word {
    fill: currentColor;
    font-size: 15px;
    font-weight: 600;
    text-anchor: middle;
  }

  .box {
    fill: var(--colour-surface);
    stroke: var(--colour-accent);
    stroke-width: 2.5;
  }

  .call.kept {
    color: var(--colour-text-muted);
  }

  .call.new {
    color: var(--colour-success);
  }

  .call.new .call-line {
    stroke-width: 3.5;
  }

  .call.gone {
    color: var(--colour-risk);
  }

  .call.gone .call-line {
    stroke-dasharray: 6 5;
  }

  .call.gone .call-name {
    text-decoration: line-through;
  }

  .call-word {
    fill: currentColor;
    font-size: 12px;
    font-weight: 600;
  }

  .call-note {
    fill: var(--colour-text-muted);
    font-size: 11px;
  }

  .call-name.link {
    text-decoration: underline;
    cursor: pointer;
  }

  .press {
    cursor: pointer;
  }

  .press:focus-visible {
    outline: none;
  }

  .press:focus-visible .call-name,
  .press:hover .call-name {
    font-weight: 700;
  }

  .others {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
