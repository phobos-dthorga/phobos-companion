<script lang="ts">
  import { onMount, tick } from "svelte";
  import CodeViewer from "../code/CodeViewer.svelte";
  import type { EntryRequest } from "../code/types";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import RichText from "../shell/RichText.svelte";
  import { heard, started } from "../shell/progress";
  import AsItStood from "./AsItStood.svelte";
  import { sections, versionWords } from "../changelog/presentation";
  import { readTimeline } from "./desktopClient";
  import {
    byDay,
    canReadAsItStood,
    canShowCode,
    dayWords,
    KIND_LOOKS,
    lanes,
    laneOf,
    monthStarts,
    rows,
    shortDay,
    showingFilter,
    timeWords,
    unlisted,
    type Showing,
  } from "./presentation";
  import type { Fact, FactKind, StoodRequest, TimelineReading } from "./types";

  /**
   * What happened to a game's products over time: an overview with one lane a product and a mark on each day something happened,
   * and every fact day by day beneath it, newest first. Reads changelogs, git and this PC's history log only, so it works the
   * same for every game on the owner's list.
   */
  let { game }: { game: GameHome } = $props();

  /** Days shown at first, and added by each press of "older days". */
  const DAYS_AT_ONCE = 10;

  let reading = $state<TimelineReading>({ state: "reading" });
  let progress = $state(started());
  let showing = $state<Showing>("all");
  let only = $state<string | null>(null);
  let shownDays = $state(DAYS_AT_ONCE);
  let focusedDay = $state<string | null>(null);
  let stood = $state<StoodRequest | null>(null);
  let code = $state<EntryRequest | null>(null);
  let scroller = $state<HTMLDivElement | null>(null);

  const facts = $derived(
    reading.state === "ready"
      ? reading.timeline.facts.filter(showingFilter(showing))
      : [],
  );
  const overview = $derived(lanes(facts));
  const manyRepositories = $derived(
    reading.state === "ready" && reading.timeline.repositories.length > 1,
  );
  const months = $derived(monthStarts(overview.days));
  const days = $derived(
    byDay(only ? facts.filter((fact) => laneOf(fact) === only) : facts),
  );

  /** The words for each kind, with the key written out so the catalogue check can find it. */
  function kindWords(fact: Fact): string {
    const count = fact.count ?? 0;
    const words: Record<FactKind, () => string> = {
      "product-started": () => t("timeline-kind-product-started", { count }),
      "version-written": () => t("timeline-kind-version-written", { count }),
      "entries-added": () => t("timeline-kind-entries-added", { count }),
      "entries-reworded": () => t("timeline-kind-entries-reworded", { count }),
      "entries-removed": () => t("timeline-kind-entries-removed", { count }),
      "version-removed": () => t("timeline-kind-version-removed"),
      "version-released": () => t("timeline-kind-version-released"),
      "product-renamed": () =>
        t("timeline-kind-product-renamed", {
          was: fact.was ?? "",
          now: fact.now ?? "",
        }),
      "product-ended": () =>
        fact.mergedInto
          ? t("timeline-kind-product-ended", { into: fact.mergedInto })
          : t("timeline-kind-product-ended-alone"),
      installed: () => t("timeline-kind-installed"),
      "went-back": () => t("timeline-kind-went-back"),
      "backed-up": () => t("timeline-kind-backed-up"),
      built: () =>
        fact.ok === false
          ? t("timeline-kind-built-failed")
          : t("timeline-kind-built"),
      encoded: () =>
        t("timeline-kind-encoded", { count: fact.mods?.length ?? count }),
    };
    return words[fact.kind]();
  }

  /** A mark's short name, for the key beside the overview. */
  const MARK_NAMES: Record<FactKind, string> = {
    "version-released": "timeline-mark-version-released",
    "product-ended": "timeline-mark-product-ended",
    installed: "timeline-mark-installed",
    "went-back": "timeline-mark-went-back",
    "version-written": "timeline-mark-version-written",
    "product-started": "timeline-mark-product-started",
    "product-renamed": "timeline-mark-product-renamed",
    "version-removed": "timeline-mark-version-removed",
    "entries-removed": "timeline-mark-entries-removed",
    "entries-reworded": "timeline-mark-entries-reworded",
    "entries-added": "timeline-mark-entries-added",
    "backed-up": "timeline-mark-backed-up",
    built: "timeline-mark-built",
    encoded: "timeline-mark-encoded",
  };

  /** When a fact happened, where, and in which repository when the game has several. */
  function whenWords(fact: Fact): string {
    const parts = [timeWords(fact.time)];
    if (fact.source === "log") parts.push(t("timeline-from-pc"));
    if (manyRepositories && fact.repository) parts.push(fact.repository);
    return parts.join(" · ");
  }

  /** The words for several mods done together. */
  function batchWords(kind: FactKind, count: number): string {
    if (kind === "backed-up") return t("timeline-batch-backed-up", { count });
    if (kind === "went-back") return t("timeline-batch-went-back", { count });
    return t("timeline-batch-installed", { count });
  }

  async function load() {
    reading = { state: "reading" };
    progress = started();
    reading = await readTimeline(game.id, (message) => {
      progress = heard(progress, message);
    });
    await tick();
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }

  /** Opens a day in the list below and puts the keyboard on its heading. */
  async function jump(day: string) {
    const index = days.findIndex((d) => d.day === day);
    if (index >= shownDays) shownDays = index + 1;
    focusedDay = day;
    await tick();
    const heading = document.getElementById(`timeline-day-${day}`);
    heading?.scrollIntoView({ block: "start" });
    heading?.focus();
  }

  function readStood(fact: Fact) {
    stood = {
      repository: fact.repository ?? "",
      changelog: fact.changelog ?? "",
      product: laneOf(fact) ?? "",
      commit: fact.source === "git" ? (fact.commit ?? null) : null,
      when: fact.time,
    };
  }

  function showCode(fact: Fact) {
    const first = fact.entries?.[0];
    const lead = first?.lead ?? fact.subject ?? "";
    code = {
      repository: fact.repository ?? "",
      changelog: fact.changelog ?? "",
      product: laneOf(fact) ?? "",
      entry: {
        version: fact.version ?? "",
        section: first?.section ?? "",
        text: lead,
        lead,
      },
      commit: fact.commit ?? null,
    };
  }

  function cellWords(
    name: string,
    day: string,
    cellFacts: Fact[],
    strongest: FactKind,
  ) {
    const top =
      cellFacts.find((fact) => fact.kind === strongest) ?? cellFacts[0];
    return t("timeline-cell", {
      product: name,
      day: dayWords(day),
      what: kindWords(top),
      more: cellFacts.length - 1,
    });
  }

  onMount(load);
</script>

<div class="eyebrow accent">{t("timeline-kicker")}</div>
<h1>{t("timeline-title", { game: game.name })}</h1>
<p class="lead">{t("timeline-lead")}</p>

{#if reading.state === "reading"}
  <ProgressBar {progress} fallback={t("timeline-reading")} />
{:else if reading.state === "browser"}
  <p class="muted">{t("timeline-browser")}</p>
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if reading.timeline.facts.length === 0}
  <p class="lead">{t("timeline-none", { game: game.name })}</p>
{:else}
  <div class="controls">
    <div class="toggles" role="group" aria-label={t("timeline-showing-label")}>
      <button
        type="button"
        class="toggle"
        aria-pressed={showing === "all"}
        onclick={() => (showing = "all")}>{t("timeline-showing-all")}</button
      >
      <button
        type="button"
        class="toggle"
        aria-pressed={showing === "git"}
        onclick={() => (showing = "git")}>{t("timeline-showing-git")}</button
      >
      <button
        type="button"
        class="toggle"
        aria-pressed={showing === "log"}
        onclick={() => (showing = "log")}>{t("timeline-showing-log")}</button
      >
    </div>
    <span class="muted small">
      {t("timeline-summary", {
        facts: facts.length,
        days: overview.days.length,
      })}
    </span>
    <button type="button" class="action" onclick={load}
      >{t("timeline-read-again")}</button
    >
  </div>
  {#if !reading.timeline.log_exists}
    <p class="muted small note">{t("timeline-no-log", { game: game.name })}</p>
  {/if}

  {#if overview.lanes.length > 0}
    <section class="overview" aria-labelledby="timeline-overview-title">
      <h2 id="timeline-overview-title">{t("timeline-overview-title")}</h2>
      <p class="muted small">{t("timeline-overview-about")}</p>
      <div
        class="scroller"
        bind:this={scroller}
        role="group"
        aria-label={t("timeline-overview-label")}
      >
        <div
          class="grid"
          style:grid-template-columns={`minmax(160px, max-content) repeat(${overview.days.length}, 44px)`}
        >
          <span class="corner"></span>
          {#each overview.days as day (day)}
            <span class="month muted" aria-hidden="true"
              >{months.has(day) ? shortDay(day).month : ""}</span
            >
          {/each}
          <span class="corner"></span>
          {#each overview.days as day (day)}
            <span class="date muted" aria-hidden="true"
              >{shortDay(day).date}</span
            >
          {/each}
          {#each overview.lanes as lane (lane.name)}
            <button
              type="button"
              class="lane-name toggle"
              aria-pressed={only === lane.name}
              title={t("timeline-only", { product: lane.name })}
              onclick={() => (only = only === lane.name ? null : lane.name)}
            >
              {lane.name}
              {#if lane.ended}<span class="muted"
                  >{t("timeline-lane-ended")}</span
                >{/if}
            </button>
            {#each overview.days as day (day)}
              {@const cell = lane.cells.get(day)}
              {#if cell}
                <button
                  type="button"
                  class="cell tone-{KIND_LOOKS[cell.strongest].tone}"
                  aria-label={cellWords(
                    lane.name,
                    day,
                    cell.facts,
                    cell.strongest,
                  )}
                  title={cellWords(lane.name, day, cell.facts, cell.strongest)}
                  onclick={() => jump(day)}
                >
                  <span aria-hidden="true"
                    >{KIND_LOOKS[cell.strongest].mark}</span
                  >
                  {#if cell.facts.length > 1}<span
                      class="count"
                      aria-hidden="true">{cell.facts.length}</span
                    >{/if}
                </button>
              {:else}
                <span class="empty" aria-hidden="true"></span>
              {/if}
            {/each}
          {/each}
        </div>
      </div>
      <details class="legend">
        <summary>{t("timeline-legend-title")}</summary>
        <ul>
          {#each Object.entries(KIND_LOOKS) as [kind, look] (kind)}
            <li>
              <span class="mark tone-{look.tone}" aria-hidden="true"
                >{look.mark}</span
              >
              {t(MARK_NAMES[kind as FactKind])}
            </li>
          {/each}
        </ul>
      </details>
    </section>
  {/if}

  <section class="days" aria-labelledby="timeline-days-title">
    <div class="days-head">
      <h2 id="timeline-days-title">{t("timeline-days-title")}</h2>
      {#if only}
        <button type="button" class="action" onclick={() => (only = null)}>
          {t("timeline-only-clear", { product: only })}
        </button>
      {/if}
    </div>
    {#each days.slice(0, shownDays) as group (group.day)}
      <section
        class="day"
        class:focused={focusedDay === group.day}
        aria-labelledby={`timeline-day-${group.day}`}
      >
        <h3 id={`timeline-day-${group.day}`} tabindex="-1">
          {dayWords(group.day)}
        </h3>
        <ol class="facts">
          {#each rows(group.facts) as row, index (index)}
            {#if row.kind === "batch"}
              <li class="fact">
                <span
                  class="mark tone-{KIND_LOOKS[row.factKind].tone}"
                  aria-hidden="true">{KIND_LOOKS[row.factKind].mark}</span
                >
                <div class="fact-body">
                  <p class="fact-head">
                    <strong>{batchWords(row.factKind, row.facts.length)}</strong
                    >
                    <span class="muted small">{whenWords(row.facts[0])}</span>
                  </p>
                  <p class="muted small">{t("timeline-batch-hint")}</p>
                  <div class="chips">
                    {#each row.facts as fact, chipIndex (chipIndex)}
                      {#if canReadAsItStood(fact)}
                        <button
                          type="button"
                          class="chip"
                          aria-label={t("timeline-read-stood-for", {
                            product: laneOf(fact) ?? "",
                            day: dayWords(group.day),
                          })}
                          onclick={() => readStood(fact)}
                        >
                          {laneOf(fact)}
                          {#if fact.version}<span class="version"
                              >{versionWords(fact.version)}</span
                            >{/if}
                        </button>
                      {:else}
                        <span class="chip">
                          {laneOf(fact)}
                          {#if fact.version}<span class="version"
                              >{versionWords(fact.version)}</span
                            >{/if}
                        </span>
                      {/if}
                    {/each}
                  </div>
                </div>
              </li>
            {:else}
              {@const fact = row.fact}
              <li class="fact">
                <span
                  class="mark tone-{KIND_LOOKS[fact.kind].tone}"
                  aria-hidden="true">{KIND_LOOKS[fact.kind].mark}</span
                >
                <div class="fact-body">
                  <div class="fact-top">
                    <p class="fact-head">
                      {#if laneOf(fact)}<strong>{laneOf(fact)}</strong>{/if}
                      {#if fact.version}<span class="version"
                          >{versionWords(fact.version)}</span
                        >{/if}
                      <span>{kindWords(fact)}</span>
                      <span class="muted small">{whenWords(fact)}</span>
                    </p>
                    {#if canReadAsItStood(fact) || canShowCode(fact)}
                      <div class="fact-actions">
                        {#if canReadAsItStood(fact)}
                          <button
                            type="button"
                            class="action"
                            aria-label={t("timeline-read-stood-for", {
                              product: laneOf(fact) ?? "",
                              day: dayWords(group.day),
                            })}
                            onclick={() => readStood(fact)}
                            >{t("timeline-read-stood")}</button
                          >
                        {/if}
                        {#if canShowCode(fact)}
                          <button
                            type="button"
                            class="action"
                            aria-label={t("timeline-show-code-for", {
                              subject: fact.subject ?? "",
                            })}
                            title={fact.subject}
                            onclick={() => showCode(fact)}
                            >{t("code-show")}</button
                          >
                        {/if}
                      </div>
                    {/if}
                  </div>
                  {#if fact.summary || fact.subject}
                    <p class="small about-line">
                      {fact.summary || fact.subject}
                    </p>
                  {/if}
                  {#if fact.kind === "went-back" && fact.fromVersion}
                    <p class="muted small">
                      {t("timeline-went-back-from", {
                        version: fact.fromVersion,
                      })}
                    </p>
                  {/if}
                  {#if fact.entries && fact.entries.length > 0}
                    <div class="sections">
                      {#each sections(fact.entries) as section, sectionIndex (sectionIndex)}
                        <span class="section-name">{section.section}</span>
                        <ul class="entries">
                          {#each section.entries as entry, entryIndex (entryIndex)}
                            <li>
                              <RichText text={entry.lead} />
                              {#if entry.was && entry.now}
                                <details>
                                  <summary
                                    >{t("timeline-show-rewording")}</summary
                                  >
                                  <p class="small">
                                    <span class="muted"
                                      >{t("timeline-was")}</span
                                    >
                                    <RichText text={entry.was} />
                                  </p>
                                  <p class="small">
                                    <span class="muted"
                                      >{t("timeline-now")}</span
                                    >
                                    <RichText text={entry.now} />
                                  </p>
                                </details>
                              {/if}
                            </li>
                          {/each}
                        </ul>
                      {/each}
                    </div>
                    {#if unlisted(fact) > 0}
                      <p class="muted small">
                        {t("timeline-unlisted", { count: unlisted(fact) })}
                      </p>
                    {/if}
                  {/if}
                </div>
              </li>
            {/if}
          {/each}
        </ol>
      </section>
    {/each}
    {#if days.length > shownDays}
      <button
        type="button"
        class="action more"
        onclick={() => (shownDays += DAYS_AT_ONCE)}
      >
        {t("timeline-more-days", {
          count: Math.min(DAYS_AT_ONCE, days.length - shownDays),
        })}
      </button>
    {/if}
  </section>
  <p class="muted how">{t("timeline-how")}</p>
{/if}

{#if stood}
  {#key `${stood.changelog}/${stood.commit ?? stood.when}`}
    <AsItStood game={game.id} request={stood} onclose={() => (stood = null)} />
  {/key}
{/if}

{#if code}
  {#key `${code.changelog}/${code.commit}`}
    <CodeViewer game={game.id} request={code} onclose={() => (code = null)} />
  {/key}
{/if}

<style>
  h2 {
    margin: 0 0 4px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  h3 {
    margin: 0 0 8px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  .note {
    max-width: 80ch;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
  }

  .overview,
  .days {
    margin-top: 18px;
  }

  .scroller {
    overflow-x: auto;
    padding-bottom: 6px;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    background: var(--colour-surface-raised);
  }

  .grid {
    display: grid;
    gap: 2px;
    align-items: center;
    padding: 8px;
    width: max-content;
  }

  .corner,
  .lane-name {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--colour-surface-raised);
  }

  .lane-name {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-inline-end: 8px;
    text-align: start;
    font-size: var(--type-small);
    color: var(--colour-text);
  }

  .month,
  .date {
    font-size: var(--type-caption);
    text-align: center;
    white-space: nowrap;
  }

  .month {
    text-align: start;
    overflow: visible;
  }

  .cell,
  .empty {
    width: 44px;
    height: 44px;
  }

  .cell {
    position: relative;
    display: grid;
    place-items: center;
    padding: 0;
    font: inherit;
    font-size: 1.25rem;
    background: var(--colour-surface-soft);
    border: 1px solid currentColor;
    border-radius: 4px;
    cursor: pointer;
  }

  .empty {
    border-bottom: 1px dotted var(--colour-line);
  }

  .count {
    position: absolute;
    right: 3px;
    bottom: 1px;
    font-size: var(--type-caption);
    color: var(--colour-text);
  }

  .tone-observed {
    color: var(--colour-observed);
  }

  .tone-success {
    color: var(--colour-success);
  }

  .tone-risk {
    color: var(--colour-risk);
  }

  .tone-comparison {
    color: var(--colour-comparison);
  }

  .tone-accent {
    color: var(--colour-accent);
  }

  .legend {
    margin-top: 8px;
    font-size: var(--type-small);
  }

  .legend summary,
  .fact details summary {
    min-height: var(--control-min);
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .legend ul {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
  }

  .mark {
    display: inline-block;
    width: 1.5em;
    text-align: center;
    font-size: 1.125rem;
  }

  /* A fact's mark sits on its first line, which is a control's height tall. */
  .fact > .mark {
    flex: none;
    line-height: var(--control-min);
  }

  .fact-head {
    min-height: var(--control-min);
  }

  .days-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
  }

  .day {
    margin-top: 12px;
    padding: 12px 16px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .day.focused {
    border: 2px solid var(--colour-accent);
  }

  .facts {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .fact {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .fact-body {
    flex: 1;
    min-width: 0;
  }

  .fact-body p {
    margin: 0 0 4px;
  }

  .fact-top {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 4px 16px;
  }

  .fact-top .fact-head {
    flex: 1 1 320px;
    min-height: var(--control-min);
    margin: 0;
  }

  .about-line {
    max-width: 100ch;
  }

  .sections {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 2px 14px;
    max-width: 120ch;
    margin: 2px 0 4px;
  }

  .section-name {
    padding-top: 2px;
    font-size: var(--type-caption);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--colour-text-muted);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: var(--control-min);
    padding-inline: 12px;
    font: inherit;
    font-size: var(--type-small);
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  button.chip {
    cursor: pointer;
    border-color: var(--colour-accent);
  }

  .fact-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
  }

  .version {
    padding: 0 8px;
    font-size: var(--type-small);
    border: 1px solid var(--colour-line);
    border-radius: 999px;
  }

  .entries {
    margin: 0;
    padding-inline-start: 18px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: var(--type-small);
  }

  .fact-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .more {
    margin-top: 12px;
  }
</style>
