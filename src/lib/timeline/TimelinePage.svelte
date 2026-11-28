<script lang="ts">
  import { matchesFilter } from "../shell/filter";
  import FilterBox from "../shell/FilterBox.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import { COMMIT_ONLY_CHANGELOG } from "../code/presentation";
  import Pager from "../shell/Pager.svelte";
  import { pageHolding, pageOf } from "../shell/paging";
  import { here, openDialog, setFocus } from "../navigation/navigation.svelte";
  import { onMount, tick, untrack } from "svelte";
  import type { EntryRequest } from "../code/types";
  import type { GameHome } from "../home/types";
  import { LOCALE, t } from "../i18n/runtime";
  import { formatSize } from "../shell/sizes";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import RichText from "../shell/RichText.svelte";
  import { heard, started } from "../shell/progress";
  import { sections, versionWords } from "../changelog/presentation";
  import { readTimeline } from "./desktopClient";
  import {
    byDay,
    canReadAsItStood,
    canShowCode,
    dayOf,
    dayWords,
    isKnownKind,
    KIND_LOOKS,
    lanes,
    lookOf,
    mergedFrom,
    laneOf,
    monthStarts,
    rows,
    runningOn,
    shortDay,
    showingFilter,
    timeWords,
    unlisted,
    withShotDays,
    type Showing,
  } from "./presentation";
  import ShotStrip from "../gamefiles/ShotStrip.svelte";
  import { readScreenshots, shotsByDay, type Shot } from "../gamefiles/shots";
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
  /** The lane names' column: fixed, so a long name ("merged into ...") wraps instead of widening the column over the marks. */
  const LANE_NAME_PX = 160;
  /** Which page of days the list shows, newest days first. */
  let dayPage = $state(1);
  let focusedDay = $state<string | null>(null);
  /** The day whose "what was I running then?" is open. */
  let runningDay = $state<string | null>(null);
  let scroller = $state<HTMLDivElement | null>(null);

  const facts = $derived(
    reading.state === "ready"
      ? reading.timeline.facts.filter(showingFilter(showing))
      : [],
  );
  /** The game's screenshots by the day they were taken (0.32.0); read beside the facts, never holding them up. */
  let shots = $state<Map<string, Shot[]>>(new Map());
  const shotDays = $derived([...shots.keys()]);

  const overview = $derived(lanes(facts));
  /** The overview's days: those something happened on, and those screenshots were taken on. */
  const overviewDays = $derived(
    [...new Set([...overview.days, ...shotDays])].sort(),
  );
  const manyRepositories = $derived(
    reading.state === "ready" && reading.timeline.repositories.length > 1,
  );
  const months = $derived(monthStarts(overviewDays));
  /** Ctrl + F's filter (0.110.0): facts whose words hold every word typed; screenshots step aside while it is used. */
  let filterText = $state("");
  const days = $derived(
    withShotDays(
      byDay(
        facts.filter(
          (fact) =>
            (!only || laneOf(fact) === only) &&
            matchesFilter(
              [
                fact.subject,
                fact.product,
                fact.mod,
                fact.version,
                fact.summary,
                fact.repository,
              ],
              filterText,
            ),
        ),
      ),
      only || filterText.trim() ? [] : shotDays,
    ),
  );
  const pagedDays = $derived(pageOf(days, dayPage, DAYS_AT_ONCE));

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
      "setting-added": () => t("timeline-kind-setting-added"),
      "setting-removed": () => t("timeline-kind-setting-removed"),
      "setting-default": () => t("timeline-kind-setting-default"),
      "duplicates-removed": () =>
        t("timeline-kind-duplicates-removed", { count }),
      "backups-packed": () =>
        t("timeline-kind-backups-packed", {
          count,
          before: sizeOf(fact.before),
          after: sizeOf(fact.after),
        }),
      "safe-copies": () =>
        t("timeline-kind-safe-copies", {
          files: fact.files ?? 0,
          size: sizeOf(fact.bytes),
        }),
      "mod-list-change": () =>
        t("timeline-kind-mod-list-change", { change: fact.change ?? "" }),
      "perf-recorded": () =>
        t("timeline-kind-perf-recorded", {
          label: fact.label || fact.recording || "",
          finding: fact.finding ?? "",
        }),
      "memory-watched": () =>
        t("timeline-kind-memory-watched", {
          label: fact.label || fact.watch || "",
        }),
    };
    // 0.117.1: a kind from a newer tool kit is named as the kit names it, never thrown on.
    return isKnownKind(fact.kind)
      ? words[fact.kind]()
      : t("timeline-kind-other", { kind: String(fact.kind) });
  }

  /** A size the kit gave in bytes, in the units a person reads. */
  function sizeOf(bytes: unknown): string {
    return formatSize(typeof bytes === "number" ? bytes : 0, LOCALE);
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
    "setting-added": "timeline-mark-setting-added",
    "setting-removed": "timeline-mark-setting-removed",
    "setting-default": "timeline-mark-setting-default",
    "duplicates-removed": "timeline-mark-duplicates-removed",
    "backups-packed": "timeline-mark-backups-packed",
    "safe-copies": "timeline-mark-safe-copies",
    "mod-list-change": "timeline-mark-mod-list-change",
    "perf-recorded": "timeline-mark-perf-recorded",
    "memory-watched": "timeline-mark-memory-watched",
  };

  /** One setting's words: its label, or its key where the settings window's label is not known, and what happened to it. */
  function settingWords(fact: Fact): string {
    const name = fact.label || fact.key || "";
    return fact.kind === "setting-default"
      ? t("timeline-setting-default", {
          name,
          before: fact.before ?? "",
          after: fact.after ?? "",
        })
      : fact.kind === "setting-removed"
        ? t("timeline-setting-removed", { name, before: fact.before ?? "" })
        : t("timeline-setting-added", { name, after: fact.after ?? "" });
  }

  /** How many of each kind a commit's settings row holds, in words. */
  function settingsHead(facts: Fact[]): string {
    const count = (kind: FactKind) =>
      facts.filter((f) => f.kind === kind).length;
    return t("timeline-settings-row", {
      added: count("setting-added"),
      changed: count("setting-default"),
      removed: count("setting-removed"),
    });
  }

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

  /** A set of tools has no screenshots; a game whose pictures cannot be read simply shows none, as before. */
  async function loadShots() {
    if (game.kind === "tools") return;
    const answer = await readScreenshots(game.id);
    shots =
      answer.state === "ready" ? shotsByDay(answer.shots.list) : new Map();
  }

  async function load() {
    void loadShots();
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
    if (here().focus.day !== day) setFocus({ day });
    const index = days.findIndex((d) => d.day === day);
    if (index >= 0) dayPage = pageHolding(index, DAYS_AT_ONCE);
    focusedDay = day;
    await tick();
    const heading = document.getElementById(`timeline-day-${day}`);
    heading?.scrollIntoView({ block: "start" });
    heading?.focus();
  }

  function viewStood(request: StoodRequest) {
    openDialog({ kind: "stood", request });
  }

  function viewCode(request: EntryRequest) {
    openDialog({ kind: "code", request });
  }

  function readStood(fact: Fact) {
    viewStood({
      repository: fact.repository ?? "",
      changelog: fact.changelog ?? "",
      product: laneOf(fact) ?? "",
      commit: fact.source === "git" ? (fact.commit ?? null) : null,
      when: fact.time,
    });
  }

  function showCode(fact: Fact) {
    const first = fact.entries?.[0];
    const lead = first?.lead ?? fact.subject ?? "";
    viewCode({
      repository: fact.repository ?? "",
      changelog: fact.changelog || COMMIT_ONLY_CHANGELOG,
      product: laneOf(fact) ?? "",
      entry: {
        version: fact.version ?? "",
        section: first?.section ?? "",
        text: lead,
        lead,
      },
      commit: fact.commit ?? null,
    });
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

  /** A day the place names (a link, or Back) is opened once the facts are read. */
  const focusDay = $derived(here().focus.day ?? null);
  $effect(() => {
    if (focusDay && reading.state === "ready")
      untrack(() => void jump(focusDay));
  });
</script>

<div class="eyebrow accent">{t("timeline-kicker")}</div>
<h1>{t("timeline-title", { game: game.name })}</h1>
<p class="lead">{t("timeline-lead")}</p>

<!-- 0.117.1: an answer that cannot be drawn says so, rather than leaving the bar where it stopped (the owner's screen note of
     28 Nov 2026). -->
<svelte:boundary>
  {#snippet failed(error, reset)}
    <p>
      {t("timeline-show-failed", {
        reason: error instanceof Error ? error.message : String(error),
      })}
    </p>
    <button
      type="button"
      class="action"
      onclick={() => {
        reset();
        void load();
      }}>{t("timeline-read-again")}</button
    >
  {/snippet}
  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("timeline-reading")} />
    <Placeholder shape="chart" height={160} />
    <Placeholder shape="rows" rows={5} />
  {:else if reading.state === "browser"}
    <p class="muted">{t("timeline-browser")}</p>
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={load} />
  {:else if reading.timeline.facts.length === 0}
    <p class="lead">{t("timeline-none", { game: game.name })}</p>
  {:else}
    <div class="controls">
      <div
        class="toggles"
        role="group"
        aria-label={t("timeline-showing-label")}
      >
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
      <p class="muted small note">
        {t("timeline-no-log", { game: game.name })}
      </p>
    {/if}

    {#if overview.lanes.length > 0 || shots.size > 0}
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
            style:grid-template-columns={`${LANE_NAME_PX}px repeat(${overviewDays.length}, 44px)`}
          >
            <span class="corner"></span>
            {#each overviewDays as day (day)}
              <span class="month muted" aria-hidden="true"
                >{months.has(day) ? shortDay(day).month : ""}</span
              >
            {/each}
            <span class="corner"></span>
            {#each overviewDays as day (day)}
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
                    >{lane.mergedInto
                      ? t("timeline-lane-merged", { into: lane.mergedInto })
                      : t("timeline-lane-ended")}</span
                  >{/if}
              </button>
              {#each overviewDays as day (day)}
                {@const cell = lane.cells.get(day)}
                {#if cell}
                  <button
                    type="button"
                    class="cell tone-{lookOf(cell.strongest).tone}"
                    aria-label={cellWords(
                      lane.name,
                      day,
                      cell.facts,
                      cell.strongest,
                    )}
                    title={cellWords(
                      lane.name,
                      day,
                      cell.facts,
                      cell.strongest,
                    )}
                    onclick={() => jump(day)}
                  >
                    <span aria-hidden="true">{lookOf(cell.strongest).mark}</span
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
            {#if shots.size > 0}
              <span class="lane-name shots-lane"
                >{t("timeline-shots-lane")}</span
              >
              {#each overviewDays as day (day)}
                {@const taken = shots.get(day)?.length ?? 0}
                {#if taken > 0}
                  <button
                    type="button"
                    class="cell tone-observed"
                    aria-label={t("timeline-shots-cell", {
                      day: dayWords(day),
                      count: taken,
                    })}
                    title={t("timeline-shots-cell", {
                      day: dayWords(day),
                      count: taken,
                    })}
                    onclick={() => jump(day)}
                  >
                    <span aria-hidden="true">▣</span>
                    {#if taken > 1}<span class="count" aria-hidden="true"
                        >{taken}</span
                      >{/if}
                  </button>
                {:else}
                  <span class="empty" aria-hidden="true"></span>
                {/if}
              {/each}
            {/if}
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
          {@const into = overview.lanes.find(
            (l) => l.name === only,
          )?.mergedInto}
          {#if into && overview.lanes.some((l) => l.name === into)}
            <button type="button" class="action" onclick={() => (only = into)}>
              {t("timeline-follow-into", { into })}
            </button>
          {/if}
          {#each mergedFrom(overview.lanes, only) as from (from)}
            <button type="button" class="action" onclick={() => (only = from)}>
              {t("timeline-follow-from", { from })}
            </button>
          {/each}
        {/if}
      </div>
      <FilterBox bind:value={filterText} label={t("timeline-filter")} />
      {@render dayPager()}
      {#each pagedDays.items as group (group.day)}
        <section
          class="day"
          class:focused={focusedDay === group.day}
          aria-labelledby={`timeline-day-${group.day}`}
        >
          <div class="day-head">
            <h3 id={`timeline-day-${group.day}`} tabindex="-1">
              {dayWords(group.day)}
            </h3>
            <button
              type="button"
              class="toggle"
              aria-pressed={runningDay === group.day}
              aria-expanded={runningDay === group.day}
              aria-controls={`timeline-running-${group.day}`}
              onclick={() =>
                (runningDay = runningDay === group.day ? null : group.day)}
              >{t("timeline-running-button")}</button
            >
          </div>
          {#if runningDay === group.day && reading.state === "ready"}
            {@const running = runningOn(reading.timeline.facts, group.day)}
            <section
              class="running"
              id={`timeline-running-${group.day}`}
              aria-label={t("timeline-running-title", {
                day: dayWords(group.day),
              })}
            >
              <h4>
                {t("timeline-running-title", { day: dayWords(group.day) })}
              </h4>
              {#if running.length === 0}
                <p class="muted small">{t("timeline-running-none")}</p>
              {:else}
                <ul class="running-list">
                  {#each running as item (`${item.fact.repository}/${item.fact.mod}`)}
                    <li>
                      <strong>{item.name}</strong>
                      <span class="version">{item.version}</span>
                      <span class="muted small"
                        >{t("timeline-running-since", {
                          time:
                            dayWords(dayOf(item.fact.time)) +
                            " " +
                            timeWords(item.fact.time),
                        })}</span
                      >
                      {#if canReadAsItStood(item.fact)}
                        <button
                          type="button"
                          class="action"
                          aria-label={t("timeline-read-stood-for", {
                            product: item.name,
                            day: dayWords(dayOf(item.fact.time)),
                          })}
                          onclick={() => readStood(item.fact)}
                          >{t("timeline-read-stood")}</button
                        >
                      {/if}
                    </li>
                  {/each}
                </ul>
                <p class="muted small">{t("timeline-running-how")}</p>
              {/if}
            </section>
          {/if}
          {#if shots.get(group.day)}
            {@const dayShots = shots.get(group.day) ?? []}
            <h4 class="shots-head">
              {t("timeline-shots-day", { count: dayShots.length })}
            </h4>
            <ShotStrip
              shots={dayShots}
              label={t("timeline-shots-label", { day: dayWords(group.day) })}
            />
          {/if}
          {#if group.facts.length === 0}
            <p class="muted small">{t("timeline-shots-only")}</p>
          {/if}
          <ol class="facts" hidden={group.facts.length === 0}>
            {#each rows(group.facts) as row, index (index)}
              {#if row.kind === "settings"}
                {@const first = row.facts[0]}
                <li class="fact">
                  <span
                    class="mark tone-{lookOf(first.kind).tone}"
                    aria-hidden="true">{lookOf(first.kind).mark}</span
                  >
                  <div class="fact-body">
                    <div class="fact-top">
                      <p class="fact-head">
                        {#if laneOf(first)}<strong>{laneOf(first)}</strong>{/if}
                        <span>{settingsHead(row.facts)}</span>
                        <span class="muted small">{whenWords(first)}</span>
                      </p>
                      {#if canShowCode(first)}
                        <div class="fact-actions">
                          <button
                            type="button"
                            class="action"
                            aria-label={t("timeline-show-code-for", {
                              subject: first.subject ?? "",
                            })}
                            title={first.subject}
                            onclick={() => showCode(first)}
                            >{t("code-show")}</button
                          >
                        </div>
                      {/if}
                    </div>
                    {#if first.subject}
                      <p class="small about-line">{first.subject}</p>
                    {/if}
                    <ul class="entries settings">
                      {#each row.facts as fact, settingIndex (settingIndex)}
                        <li>
                          <span
                            class="mark-inline tone-{lookOf(fact.kind).tone}"
                            aria-hidden="true">{lookOf(fact.kind).mark}</span
                          >
                          {settingWords(fact)}
                          {#if fact.label && fact.key}<code class="key"
                              >{fact.key}</code
                            >{/if}
                        </li>
                      {/each}
                    </ul>
                  </div>
                </li>
              {:else if row.kind === "batch"}
                <li class="fact">
                  <span
                    class="mark tone-{lookOf(row.factKind).tone}"
                    aria-hidden="true">{lookOf(row.factKind).mark}</span
                  >
                  <div class="fact-body">
                    <p class="fact-head">
                      <strong
                        >{batchWords(row.factKind, row.facts.length)}</strong
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
                    class="mark tone-{lookOf(fact.kind).tone}"
                    aria-hidden="true">{lookOf(fact.kind).mark}</span
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
      {@render dayPager()}
    </section>
    <p class="muted how">{t("timeline-how")}</p>
  {/if}
</svelte:boundary>

{#snippet dayPager()}
  <Pager
    page={pagedDays.page}
    pages={pagedDays.pages}
    first={pagedDays.first}
    last={pagedDays.last}
    total={pagedDays.total}
    label={t("timeline-pages")}
    onchange={(page) => (dayPage = page)}
  />
{/snippet}

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

  .shots-lane {
    padding-inline-start: 8px;
    font-style: italic;
    color: var(--colour-observed);
  }

  .shots-head {
    margin: 8px 0 2px;
    font-size: var(--type-small);
    font-weight: 600;
  }

  .lane-name {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 6px;
    overflow-wrap: anywhere;
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

  .day-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 12px;
    margin-bottom: 8px;
  }

  .day-head h3 {
    margin: 0;
  }

  .running {
    margin: 0 0 12px;
    padding: 10px 14px;
    background: var(--colour-surface-soft);
    border-inline-start: 3px solid var(--colour-comparison);
    border-radius: 4px;
  }

  .running h4 {
    margin: 0 0 6px;
    font-size: var(--type-small);
    font-weight: 600;
  }

  .running-list {
    margin: 0 0 6px;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .running-list li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
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

  .settings li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 8px;
  }

  .mark-inline {
    font-weight: 600;
  }

  .key {
    font-size: var(--type-small);
    color: var(--colour-text-muted);
    overflow-wrap: anywhere;
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
