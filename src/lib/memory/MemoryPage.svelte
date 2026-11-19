<script lang="ts">
  import { onMount, untrack } from "svelte";
  import ChartBlock from "../charts/ChartBlock.svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import { here, setFocus } from "../navigation/navigation.svelte";
  import ReportView from "../reports/ReportView.svelte";
  import type { ChartBlockData } from "../reports/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import RichText from "../shell/RichText.svelte";
  import { heard, started } from "../shell/progress";
  import { register } from "../shortcuts/registry";
  import {
    markWatch,
    readReport,
    readStatus,
    stopWatch,
  } from "./desktopClient";
  import {
    alive,
    DEFAULT_MINUTES,
    formatClock,
    keptWords,
    MINUTES,
    minutesLeft,
    POLL_MS,
    progressFromStatus,
    QUICK_MARKS,
    stateKey,
    tiles,
  } from "./presentation";
  import type { ReportReading, StatusData, StatusReading } from "./types";
  import { beginWatch, startedFor } from "./watching.svelte";

  /**
   * The Memory page (0.23.0; owner, 19 Nov 2026: memory profiling "will be done from the Companion"): a short watch of the game's
   * memory, started on the owner's press and confirmation, followed as it runs, with the owner's own marks beside the figures, and
   * every kept watch's report. Any game whose tools offer a memory watch (the kit's `memory-watch` surface) gets it; the rest are
   * told so in words. The watch runs in the kit; this page only asks.
   */
  let { game }: { game: GameHome } = $props();

  let status = $state<StatusReading>({ state: "reading" });
  let firstProgress = $state(started());
  let full = $state<ReportReading | null>(null);
  let fullFor = $state<string | null>(null);
  let fullProgress = $state(started());

  let minutes = $state<number>(DEFAULT_MINUTES);
  let counters = $state(true);
  let label = $state("");
  let confirming = $state(false);
  let startRefusal = $state<string | null>(null);

  let markText = $state("");
  /** When the owner began the mark (pressed the key or started typing): the moment it names, in seconds since 1970. */
  let markAt = $state<number | null>(null);
  let markSaid = $state<{ ok: boolean; words: string } | null>(null);
  let stopSaid = $state<{ ok: boolean; words: string } | null>(null);
  let markInput = $state<HTMLInputElement | null>(null);
  let confirmButton = $state<HTMLButtonElement | null>(null);

  const data = $derived<StatusData | null>(
    status.state === "ready" ? status.status : null,
  );
  const available = $derived(
    status.state === "ready" ? status.reading.available : true,
  );
  const mine = $derived(startedFor(game.id));
  /** This window started a watch that has not answered yet. */
  const myWatchRunning = $derived(mine !== null && mine.ended === null);
  const live = $derived((data !== null && alive(data.state)) || myWatchRunning);
  const liveData = $derived(
    data !== null && data.state !== "none" && alive(data.state) ? data : null,
  );
  const chosen = $derived(here().focus.watch);
  /** The kept watch whose whole report shows: the one chosen, else the newest, unless it is the one running. */
  const reportFor = $derived.by(() => {
    if (!data || data.state === "none") return null;
    const kept = new Set(data.kept.map((k) => k.watch));
    const pick = chosen && kept.has(chosen) ? chosen : data.watch;
    return liveData && pick === liveData.watch ? null : pick;
  });
  const liveChart = $derived.by<ChartBlockData | null>(() => {
    if (status.state !== "ready" || !status.reading.report) return null;
    for (const section of status.reading.report.sections)
      for (const block of section.blocks)
        if (block.type === "chart") return block;
    return null;
  });
  const bar = $derived(
    mine && mine.ended === null
      ? mine.progress
      : liveData
        ? progressFromStatus(liveData, t("memory-bar-watching"))
        : started(t("memory-bar-starting")),
  );

  async function read(quiet = false) {
    if (!quiet) {
      status = { state: "reading" };
      firstProgress = started();
    }
    const next = await readStatus(game.id, null, (message) => {
      if (!quiet) firstProgress = heard(firstProgress, message);
    });
    // A quiet read that failed keeps what is on screen; the next one tries again.
    if (!quiet || next.state === "ready") status = next;
  }

  async function readFull(watch: string) {
    fullFor = watch;
    full = { state: "reading" };
    fullProgress = started();
    const answer = await readReport(game.id, watch, (message) => {
      fullProgress = heard(fullProgress, message);
    });
    if (fullFor === watch) full = answer;
  }

  onMount(() => {
    void read();
    const unregister = register({
      scope: "memory",
      inDialog: false,
      run: {
        "memory.start": askToStart,
        "memory.mark": beginMark,
        "memory.stop": () => void stop(),
      },
    });
    return unregister;
  });

  // While a watch runs, read it again every few seconds, quietly.
  $effect(() => {
    if (!live) return;
    const timer = setInterval(() => void read(true), POLL_MS);
    return () => clearInterval(timer);
  });

  // The chosen (or newest) kept watch's whole report, read once each time it changes.
  $effect(() => {
    const watch = reportFor;
    if (watch && watch !== untrack(() => fullFor)) void readFull(watch);
  });

  // When a watch this window started ends, read the page again: its report is then the newest.
  $effect(() => {
    const ended = mine?.ended;
    if (!ended) return;
    untrack(() => {
      if (ended.state === "ready" && ended.reading.data?.ok === false)
        startRefusal = String(ended.reading.data.refusal ?? "");
      else if (ended.state === "failed") startRefusal = ended.failure.detail;
      void read(true);
    });
  });

  function askToStart() {
    if (live || !available) return;
    startRefusal = null;
    confirming = true;
  }

  $effect(() => {
    if (confirming) confirmButton?.focus();
  });

  function confirmStart() {
    confirming = false;
    startRefusal = null;
    void beginWatch(
      game.id,
      { minutes, counters, label: label.trim() },
      t("memory-bar-watching"),
    );
    // The watch's folder appears within a second or two; read it then, and every few seconds after.
    setTimeout(() => void read(true), 2000);
  }

  function beginMark() {
    if (!liveData) {
      markSaid = { ok: false, words: t("memory-mark-none-running") };
      return;
    }
    markAt = Date.now() / 1000;
    markSaid = null;
    markInput?.focus();
  }

  function startTyping() {
    if (markAt === null) markAt = Date.now() / 1000;
  }

  async function sendMark(words: string, at: number) {
    const text = words.trim();
    if (!text) return;
    const answer = await markWatch(game.id, liveData?.watch ?? null, text, at);
    if (answer.state === "failed")
      markSaid = { ok: false, words: answer.failure.detail };
    else if (!answer.result.ok)
      markSaid = { ok: false, words: answer.result.refusal ?? "" };
    else {
      markSaid = {
        ok: true,
        words: t("memory-mark-done", { words: text, when: formatClock(at) }),
      };
      void read(true);
    }
  }

  function submitMark(event: SubmitEvent) {
    event.preventDefault();
    const at = markAt ?? Date.now() / 1000;
    const words = markText;
    markText = "";
    markAt = null;
    void sendMark(words, at);
  }

  function quickMark(key: string) {
    void sendMark(t(key), Date.now() / 1000);
  }

  async function stop() {
    if (!liveData) return;
    const answer = await stopWatch(game.id, liveData.watch);
    stopSaid =
      answer.state === "failed"
        ? { ok: false, words: answer.failure.detail }
        : answer.result.ok
          ? { ok: true, words: t("memory-stop-asked") }
          : { ok: false, words: answer.result.refusal ?? "" };
    void read(true);
  }

  function choose(watch: string) {
    setFocus({ watch });
  }
</script>

<div class="eyebrow accent">{t("memory-kicker")}</div>
<h1>{t("memory-title", { game: game.name })}</h1>
<p class="lead">{t("memory-lead")}</p>

{#if status.state === "reading"}
  <ProgressBar progress={firstProgress} fallback={t("memory-reading")} />
  <Placeholder shape="rows" rows={4} />
{:else if status.state === "browser"}
  <p class="lead">{t("memory-browser")}</p>
{:else if status.state === "failed"}
  <FailurePanel failure={status.failure} onretry={() => void read()} />
{:else if !available}
  <p class="lead">{t("memory-none", { game: game.name })}</p>
{:else}
  <section class="gotchas" aria-labelledby="memory-gotchas">
    <h2 id="memory-gotchas">{t("memory-gotchas-title")}</h2>
    <ul>
      <li><RichText text={t("memory-gotcha-save")} /></li>
      <li><RichText text={t("memory-gotcha-marks")} /></li>
      <li><RichText text={t("memory-gotcha-restart")} /></li>
      <li><RichText text={t("memory-gotcha-measure")} /></li>
    </ul>
  </section>

  {#if live}
    <section class="panel live" aria-labelledby="memory-live">
      <h2 id="memory-live">
        {liveData ? t(stateKey(liveData.state)) : t("memory-state-starting")}
        {#if liveData?.label}<span class="muted small">“{liveData.label}”</span
          >{/if}
      </h2>
      <ProgressBar
        progress={bar}
        fallback={t("memory-bar-starting")}
        holdsPicture={false}
      />
      {#if liveData && liveData.state === "running"}
        <p class="small muted">
          {t("memory-live-left", {
            minutes: minutesLeft(liveData),
            started: formatClock(liveData.started),
          })}
        </p>
      {/if}
      {#if liveData?.latest}
        <dl class="tiles">
          {#each tiles(liveData.latest) as tile (tile.key)}
            <div class="tile">
              <dt>{t(tile.key)}</dt>
              <dd class:unknown={!tile.known}>
                {tile.known ? tile.value : t("memory-tile-waiting")}
              </dd>
            </div>
          {/each}
        </dl>
        <p class="small muted">
          {t("memory-tiles-how", { when: formatClock(liveData.latest.t) })}
        </p>
      {/if}

      <form class="mark" onsubmit={submitMark}>
        <label for="memory-mark-text">{t("memory-mark-label")}</label>
        <div class="mark-row">
          <input
            id="memory-mark-text"
            type="text"
            maxlength={liveData?.most_mark ?? 200}
            bind:this={markInput}
            bind:value={markText}
            oninput={startTyping}
            disabled={!liveData}
            placeholder={t("memory-mark-placeholder")}
          />
          <button
            type="submit"
            class="action"
            disabled={!liveData || !markText.trim()}
            >{t("memory-mark-button")}</button
          >
        </div>
        <p class="small muted">{t("memory-mark-how")}</p>
        <div class="toggles" role="group" aria-label={t("memory-quick-label")}>
          {#each QUICK_MARKS as key (key)}
            <button
              type="button"
              class="action"
              disabled={!liveData}
              onclick={() => quickMark(key)}>{t(key)}</button
            >
          {/each}
        </div>
      </form>
      {#if markSaid}
        <p class="said" class:wrong={!markSaid.ok} role="status">
          {markSaid.words}
        </p>
      {/if}
      {#if liveData && liveData.marks.length > 0}
        <h3 class="small">{t("memory-marks-title")}</h3>
        <ul class="marks">
          {#each liveData.marks as mark, index (index)}
            <li>
              <span class="when">{formatClock(mark.t)}</span>
              {mark.text}
            </li>
          {/each}
        </ul>
      {/if}

      {#if liveChart}
        <ChartBlock chart={liveChart} />
      {/if}

      <div class="buttons">
        <button
          type="button"
          class="action"
          disabled={!liveData || liveData.state !== "running"}
          onclick={() => void stop()}>{t("memory-stop-button")}</button
        >
        <span class="small muted">{t("memory-stop-how")}</span>
      </div>
      {#if stopSaid}
        <p class="said" class:wrong={!stopSaid.ok} role="status">
          {stopSaid.words}
        </p>
      {/if}
    </section>
  {:else}
    <section class="panel" aria-labelledby="memory-start">
      <h2 id="memory-start">{t("memory-start-title")}</h2>
      <p class="small muted">{t("memory-length-label")}</p>
      <div class="toggles" role="group" aria-label={t("memory-length-label")}>
        {#each MINUTES as length (length)}
          <button
            type="button"
            class="toggle"
            aria-pressed={minutes === length}
            onclick={() => (minutes = length)}
            >{t("memory-minutes", { minutes: length })}</button
          >
        {/each}
      </div>
      <p class="small muted">{t("memory-figures-label")}</p>
      <div class="toggles" role="group" aria-label={t("memory-figures-label")}>
        <button
          type="button"
          class="toggle"
          aria-pressed={counters}
          onclick={() => (counters = true)}>{t("memory-figures-dotnet")}</button
        >
        <button
          type="button"
          class="toggle"
          aria-pressed={!counters}
          onclick={() => (counters = false)}
          >{t("memory-figures-windows")}</button
        >
      </div>
      <label class="label-field">
        <span class="small muted">{t("memory-label-label")}</span>
        <input
          type="text"
          maxlength="80"
          bind:value={label}
          placeholder={t("memory-label-placeholder")}
        />
      </label>
      {#if confirming}
        <div
          class="confirm"
          role="group"
          aria-label={t("memory-confirm-label")}
        >
          <p class="confirm-question">
            {t("memory-confirm-question", { minutes })}
          </p>
          <p class="confirm-warning">
            <RichText
              text={counters
                ? t("memory-confirm-dotnet")
                : t("memory-confirm-windows")}
            />
          </p>
          <div class="buttons">
            <button
              type="button"
              class="move-button"
              bind:this={confirmButton}
              onclick={confirmStart}>{t("memory-confirm-yes")}</button
            >
            <button
              type="button"
              class="action"
              onclick={() => (confirming = false)}
              >{t("memory-confirm-no")}</button
            >
          </div>
        </div>
      {:else}
        <div class="buttons">
          <button type="button" class="move-button" onclick={askToStart}
            >{t("memory-start-button", { minutes })}</button
          >
          <span class="small muted">{t("memory-start-how")}</span>
        </div>
      {/if}
      {#if startRefusal}
        <p class="said wrong" role="status">
          {t("memory-start-refused", { reason: startRefusal })}
        </p>
      {/if}
    </section>
  {/if}

  {#if data && data.kept.length > 0}
    <section class="panel" aria-labelledby="memory-kept">
      <h2 id="memory-kept">{t("memory-kept-title")}</h2>
      <ul class="kept">
        {#each data.kept as kept (kept.watch)}
          <li>
            <button
              type="button"
              class="toggle"
              aria-pressed={kept.watch === reportFor}
              disabled={liveData?.watch === kept.watch}
              onclick={() => choose(kept.watch)}
            >
              <span>{keptWords(kept)}</span>
              <span class="muted small">
                {t("memory-kept-detail", {
                  minutes: kept.minutes,
                  state: t(stateKey(kept.state)),
                  figures: kept.counters
                    ? t("memory-kept-dotnet")
                    : t("memory-kept-windows"),
                })}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {:else if data}
    <p class="muted">{t("memory-kept-none")}</p>
  {/if}

  {#if reportFor && full}
    <section class="report" aria-labelledby="memory-report">
      <h2 id="memory-report">{t("memory-report-title")}</h2>
      {#if full.state === "reading"}
        <ProgressBar progress={fullProgress} fallback={t("memory-reading")} />
        <Placeholder shape="rows" rows={6} />
      {:else if full.state === "failed"}
        <FailurePanel
          failure={full.failure}
          onretry={() => reportFor && void readFull(reportFor)}
        />
      {:else if full.state === "ready" && full.reading.report}
        <ReportView report={full.reading.report} />
        <p class="how muted">
          {t("memory-command-line", { line: full.reading.command_line })}
        </p>
      {/if}
    </section>
  {/if}
{/if}

<style>
  .gotchas,
  .panel {
    margin-block: 12px;
    padding: 12px 14px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .gotchas {
    border-inline-start: 4px solid var(--colour-accent);
  }

  .gotchas ul {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding-inline-start: 20px;
  }

  h2 {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    margin: 0 0 8px;
    font-size: var(--type-body);
  }

  h3 {
    margin: 12px 0 4px;
  }

  .live {
    border: 2px solid var(--colour-accent);
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
    margin: 12px 0 4px;
  }

  .tile {
    padding: 8px 10px;
    background: var(--colour-surface-soft);
    border-radius: 4px;
  }

  .tile dt {
    font-size: var(--type-small);
    color: var(--colour-text-muted);
  }

  .tile dd {
    margin: 2px 0 0;
    font-size: var(--type-lead);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .tile dd.unknown {
    font-size: var(--type-small);
    font-weight: 400;
    color: var(--colour-text-muted);
  }

  .mark {
    margin-block: 12px;
  }

  .mark label {
    font-weight: 600;
  }

  .mark-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-block: 6px;
  }

  input[type="text"] {
    flex: 1 1 280px;
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .label-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-block: 12px;
    max-width: 60ch;
  }

  .marks {
    margin: 0;
    padding-inline-start: 20px;
  }

  .when {
    font-variant-numeric: tabular-nums;
    color: var(--colour-text-muted);
  }

  .said {
    margin-block: 6px;
    color: var(--colour-success);
  }

  .said.wrong {
    color: var(--colour-risk);
  }

  .kept {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .kept .toggle {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    align-items: baseline;
    width: 100%;
    text-align: start;
  }

  .toggles {
    margin-block: 6px 10px;
  }

  .confirm {
    margin-block: 10px;
    padding: 10px 14px;
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
    border-radius: 4px;
  }

  .confirm-question {
    margin: 0 0 6px;
    font-weight: 600;
    max-width: 80ch;
  }

  .confirm-warning {
    margin-block: 4px;
    font-size: var(--type-small);
    max-width: 80ch;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }

  .move-button {
    min-height: var(--control-min);
    padding-inline: 20px;
    font: inherit;
    font-weight: 600;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
    border-radius: 4px;
    cursor: pointer;
  }

  .report {
    margin-block: 16px;
  }
</style>
