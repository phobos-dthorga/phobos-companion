<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import { go, here, setFocus } from "../navigation/navigation.svelte";
  import { place } from "../navigation/place";
  import ReportView from "../reports/ReportView.svelte";
  import { refPlace } from "../reports/refs";
  import type { Ref } from "../reports/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import RichText from "../shell/RichText.svelte";
  import { heard, started } from "../shell/progress";
  import { register } from "../shortcuts/registry";
  import { keyFor } from "../shortcuts/state.svelte";
  import { readList, readLook, readRecording } from "./desktopClient";
  import {
    chosenRecording,
    dayOf,
    DEFAULT_SECONDS,
    figure,
    firstFinding,
    firstIsRisk,
    LOOK_WORDS,
    LOOKS,
    lookNeedsText,
    others,
    SECONDS,
  } from "./presentation";
  import { costsOf, isOurs, loadCosts } from "./costs.svelte";
  import { beginRecording, busy, recording } from "./recording.svelte";
  import WhoseCode from "./WhoseCode.svelte";
  import { pageServes } from "../home/kinds";
  import type { ListReading, LookKind, ReportReading } from "./types";

  /**
   * The Performance page (0.118.0; the owner's ask of 28 Nov 2026 for "relevant, compiled, condensed information and how it
   * relates to everything else", `docs/performance.md`): a recording of the running game, started on the owner's press and yes or
   * by their key in the game, opened on its findings and the game's own figures, every row linked to the page that answers what
   * to do about it. Any game whose tools offer recordings (the kit's `performance` surface) gets it; the rest are told so.
   */
  let { game }: { game: GameHome } = $props();

  let list = $state<ListReading>({ state: "reading" });
  let listProgress = $state(started());
  let shownReading = $state<ReportReading | null>(null);
  let shownFor = $state<string | null>(null);
  let shownProgress = $state(started());
  let lookReading = $state<ReportReading | null>(null);
  let lookFor = $state<string | null>(null);
  let lookProgress = $state(started());

  let seconds = $state<number>(DEFAULT_SECONDS);
  let allocations = $state(false);
  let label = $state("");
  let confirming = $state(false);
  let confirmButton = $state<HTMLButtonElement | null>(null);
  let lookText = $state("");

  const recordings = $derived(list.state === "ready" ? list.recordings : []);
  const available = $derived(
    list.state === "ready" ? list.reading.available : true,
  );
  const focus = $derived(here().focus);
  const shown = $derived(chosenRecording(focus.recording, recordings));
  const look = $derived<LookKind | null>(
    LOOKS.includes(focus.look as LookKind) ? (focus.look as LookKind) : null,
  );
  const running = $derived(
    recording.running?.game === game.id ? recording.running : null,
  );
  const recordingNow = $derived(running !== null && !running.ended);
  const gameKey = $derived(keyFor("performance.record-in-game"));
  const repository = $derived(game.repositories[0] ?? null);

  $effect(() => loadCosts(game.id));
  const costs = $derived(costsOf(game.id));

  /** Where what a row or a finding is about opens: one of our mods at its changelog, another's in the Mod list. */
  function link(ref: Ref) {
    return refPlace(ref, game.id, repository, (name) => isOurs(costs, name));
  }

  async function read(quiet = false) {
    if (!quiet) {
      list = { state: "reading" };
      listProgress = started();
    }
    const next = await readList(game.id, (message) => {
      if (!quiet) listProgress = heard(listProgress, message);
    });
    if (!quiet || next.state === "ready") list = next;
  }

  async function readShown(name: string) {
    shownFor = name;
    shownReading = { state: "reading" };
    shownProgress = started();
    const answer = await readRecording(game.id, name, (message) => {
      shownProgress = heard(shownProgress, message);
    });
    if (shownFor === name) shownReading = answer;
  }

  async function readLookFor(name: string, kind: LookKind, text: string) {
    const key = `${name} ${kind} ${text}`;
    lookFor = key;
    lookReading = { state: "reading" };
    lookProgress = started();
    const answer = await readLook(
      game.id,
      name,
      kind,
      lookNeedsText(kind) ? text : null,
      (message) => {
        lookProgress = heard(lookProgress, message);
      },
    );
    if (lookFor === key) lookReading = answer;
  }

  onMount(() => {
    void read();
    return register({
      scope: "performance",
      inDialog: false,
      run: { "performance.record": askToRecord },
    });
  });

  // The recording shown: read once each time it changes.
  $effect(() => {
    const name = shown;
    if (name && name !== untrack(() => shownFor)) void readShown(name);
  });

  // A closer look, when one is chosen and has what it needs.
  $effect(() => {
    const name = shown;
    const kind = look;
    const text = focus.text ?? "";
    if (!name || !kind || (lookNeedsText(kind) && !text)) {
      untrack(() => {
        lookReading = null;
        lookFor = null;
      });
      return;
    }
    if (`${name} ${kind} ${text}` !== untrack(() => lookFor))
      void readLookFor(name, kind, text);
  });

  /** A recording that had ended before the page opened is not opened again: the owner may have chosen another since. */
  let handled = untrack(() =>
    recording.running?.ended ? recording.running.at : null,
  );

  // When a recording ends, read the list again and open what it made.
  $effect(() => {
    if (!running?.ended || running.at === handled) return;
    handled = running.at;
    const made = running.made;
    untrack(() => {
      void read(true).then(() => {
        if (made) setFocus({ recording: made });
      });
    });
  });

  $effect(() => {
    if (confirming) confirmButton?.focus();
  });

  function askToRecord() {
    if (busy() || !available) return;
    confirming = true;
  }

  function confirmRecord() {
    confirming = false;
    void beginRecording(
      game.id,
      { seconds, allocations, label: label.trim() },
      t("performance-bar-recording"),
    );
  }

  function choose(name: string) {
    setFocus({ recording: name });
  }

  function chooseLook(kind: LookKind) {
    lookText = "";
    setFocus({ ...focus, look: kind, text: "" });
  }

  function submitLook(event: SubmitEvent) {
    event.preventDefault();
    if (!look) return;
    setFocus({ ...focus, look, text: lookText.trim() });
  }

  function compareWith(other: string) {
    setFocus({ ...focus, look: "compare", text: other });
  }
</script>

<div class="eyebrow accent">{t("performance-kicker")}</div>
<h1>{t("performance-title", { game: game.name })}</h1>
<p class="lead">{t("performance-lead")}</p>

{#if list.state === "reading"}
  <ProgressBar progress={listProgress} fallback={t("performance-reading")} />
  <Placeholder shape="rows" rows={4} />
{:else if list.state === "browser"}
  <p class="lead">{t("performance-browser")}</p>
{:else if list.state === "failed"}
  <FailurePanel failure={list.failure} onretry={() => void read()} />
{:else if !available}
  <p class="lead">{t("performance-none", { game: game.name })}</p>
{:else}
  <section class="gotchas" aria-labelledby="performance-gotchas">
    <h2 id="performance-gotchas">{t("performance-gotchas-title")}</h2>
    <ul>
      <li><RichText text={t("performance-gotcha-save")} /></li>
      <li><RichText text={t("performance-gotcha-speed")} /></li>
      {#if gameKey}
        <li>
          <RichText text={t("performance-gotcha-key", { key: gameKey })} />
        </li>
      {/if}
      <li><RichText text={t("performance-gotcha-measure")} /></li>
    </ul>
  </section>

  {#if running && !running.ended}
    <section class="panel live" aria-labelledby="performance-live">
      <h2 id="performance-live">
        {running.from === "game"
          ? t("performance-live-from-game")
          : t("performance-live-from-page")}
      </h2>
      <ProgressBar
        progress={running.progress}
        fallback={t("performance-bar-recording")}
        holdsPicture={false}
      />
      <p class="small muted">{t("performance-live-how")}</p>
    </section>
  {:else}
    <section class="panel" aria-labelledby="performance-record">
      <h2 id="performance-record">{t("performance-record-title")}</h2>
      <p class="small muted">{t("performance-length-label")}</p>
      <div
        class="toggles"
        role="group"
        aria-label={t("performance-length-label")}
      >
        {#each SECONDS as length (length)}
          <button
            type="button"
            class="toggle"
            aria-pressed={seconds === length}
            onclick={() => (seconds = length)}
            >{t("performance-seconds", { seconds: length })}</button
          >
        {/each}
      </div>
      <div
        class="toggles"
        role="group"
        aria-label={t("performance-allocations-label")}
      >
        <button
          type="button"
          class="toggle"
          aria-pressed={allocations}
          onclick={() => (allocations = !allocations)}
          >{t("performance-allocations")}</button
        >
      </div>
      <label class="label-field">
        <span class="small muted">{t("performance-label-label")}</span>
        <input
          type="text"
          maxlength="80"
          bind:value={label}
          placeholder={t("performance-label-placeholder")}
        />
      </label>
      {#if confirming}
        <div
          class="confirm"
          role="group"
          aria-label={t("performance-confirm-label")}
        >
          <p class="confirm-question">
            {t("performance-confirm-question", { seconds })}
          </p>
          <p class="confirm-warning">
            <RichText text={t("performance-confirm-warning")} />
          </p>
          <div class="buttons">
            <button
              type="button"
              class="move-button"
              bind:this={confirmButton}
              onclick={confirmRecord}>{t("performance-confirm-yes")}</button
            >
            <button
              type="button"
              class="action"
              onclick={() => (confirming = false)}
              >{t("performance-confirm-no")}</button
            >
          </div>
        </div>
      {:else}
        <div class="buttons">
          <button type="button" class="move-button" onclick={askToRecord}
            >{t("performance-record-button", { seconds })}</button
          >
          <span class="small muted">{t("performance-record-how")}</span>
        </div>
      {/if}
      {#if running?.ended && running.refusal}
        <p class="said wrong" role="status">
          {t("performance-record-refused", { reason: running.refusal })}
        </p>
      {/if}
    </section>
  {/if}

  {#if recordings.length > 0}
    <section class="panel" aria-labelledby="performance-kept">
      <h2 id="performance-kept">{t("performance-kept-title")}</h2>
      <ul class="kept">
        {#each recordings as kept (kept.recording)}
          <li>
            <button
              type="button"
              class="toggle"
              aria-pressed={kept.recording === shown}
              onclick={() => choose(kept.recording)}
            >
              <span class="kept-name"
                >{kept.label || kept.recording}
                <span class="muted small">{kept.recorded_at}</span></span
              >
              <span class="muted small">
                {t("performance-kept-detail", {
                  seconds: figure(Number(kept.seconds)),
                  ticks: figure(kept.game?.ticks_a_second),
                })}
              </span>
              {#if kept.error}
                <span class="small wrong">{kept.error}</span>
              {:else if firstFinding(kept)}
                <span class="small" class:wrong={firstIsRisk(kept)}
                  >{firstFinding(kept)}</span
                >
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <p class="muted">{t("performance-kept-none")}</p>
  {/if}

  {#if shown}
    <section class="panel" aria-labelledby="performance-around">
      <h2 id="performance-around">{t("performance-around-title")}</h2>
      <div class="buttons">
        {#if dayOf(shown)}
          <button
            type="button"
            class="action"
            onclick={() =>
              go(place("timeline", game.id, { day: dayOf(shown) ?? "" }))}
            >{t("performance-around-timeline")}</button
          >
        {/if}
        <button
          type="button"
          class="action"
          onclick={() => go(place("memory", game.id))}
          >{t("performance-around-memory")}</button
        >
      </div>
      <p class="small muted">{t("performance-around-how")}</p>
    </section>

    {#if pageServes(game.kind, "modlist") && shownReading?.state === "ready"}
      {#key shown}
        <WhoseCode
          game={game.id}
          {repository}
          report={shownReading.reading.report}
        />
      {/key}
    {/if}

    <section class="panel" aria-labelledby="performance-look">
      <h2 id="performance-look">{t("performance-look-title")}</h2>
      <div
        class="toggles"
        role="group"
        aria-label={t("performance-look-title")}
      >
        {#each LOOKS as kind (kind)}
          <button
            type="button"
            class="toggle"
            aria-pressed={look === kind}
            onclick={() => chooseLook(kind)}>{t(LOOK_WORDS[kind])}</button
          >
        {/each}
      </div>
      {#if look === "callers" || look === "mod"}
        <form class="look-form" onsubmit={submitLook}>
          <label for="performance-look-text"
            >{look === "callers"
              ? t("performance-look-callers-label")
              : t("performance-look-mod-label")}</label
          >
          <div class="look-row">
            <input
              id="performance-look-text"
              type="text"
              maxlength="400"
              bind:value={lookText}
              placeholder={look === "callers"
                ? t("performance-look-callers-placeholder")
                : t("performance-look-mod-placeholder")}
            />
            <button type="submit" class="action" disabled={!lookText.trim()}
              >{t("performance-look-go")}</button
            >
          </div>
        </form>
      {:else if look === "compare"}
        {#if others(recordings, shown).length === 0}
          <p class="small muted">{t("performance-look-compare-none")}</p>
        {:else}
          <ul class="kept">
            {#each others(recordings, shown) as other (other.recording)}
              <li>
                <button
                  type="button"
                  class="toggle"
                  aria-pressed={focus.text === other.recording}
                  onclick={() => compareWith(other.recording)}
                  >{other.label || other.recording}
                  <span class="muted small">{other.recorded_at}</span></button
                >
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
      {#if lookReading}
        <div class="look-result">
          {#if lookReading.state === "reading"}
            <ProgressBar
              progress={lookProgress}
              fallback={t("performance-reading")}
            />
            <Placeholder shape="rows" rows={4} />
          {:else if lookReading.state === "failed"}
            <FailurePanel
              failure={lookReading.failure}
              onretry={() =>
                shown &&
                look &&
                void readLookFor(shown, look, focus.text ?? "")}
            />
          {:else if lookReading.state === "ready" && lookReading.reading.report}
            <ReportView report={lookReading.reading.report} {link} />
            <p class="how muted">
              {t("performance-command-line", {
                line: lookReading.reading.command_line,
              })}
            </p>
          {/if}
        </div>
      {/if}
    </section>

    {#if shownReading}
      <section class="report" aria-labelledby="performance-report">
        <h2 id="performance-report">{t("performance-report-title")}</h2>
        {#if shownReading.state === "reading"}
          <ProgressBar
            progress={shownProgress}
            fallback={t("performance-reading")}
          />
          <Placeholder shape="rows" rows={6} />
        {:else if shownReading.state === "failed"}
          <FailurePanel
            failure={shownReading.failure}
            onretry={() => shown && void readShown(shown)}
          />
        {:else if shownReading.state === "ready" && shownReading.reading.report}
          <ReportView report={shownReading.reading.report} {link} />
          <p class="how muted">
            {t("performance-command-line", {
              line: shownReading.reading.command_line,
            })}
          </p>
        {/if}
      </section>
    {/if}
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
    margin: 0 0 8px;
    font-size: var(--type-body);
  }

  .live {
    border: 2px solid var(--colour-accent);
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

  .look-form {
    margin-block: 10px;
  }

  .look-form label {
    font-weight: 600;
  }

  .look-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-block: 6px;
  }

  .look-result {
    margin-top: 12px;
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
    flex-direction: column;
    gap: 2px;
    width: 100%;
    text-align: start;
  }

  .kept-name {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    align-items: baseline;
    font-weight: 600;
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

  .said {
    margin-block: 6px;
    color: var(--colour-success);
  }

  .wrong,
  .said.wrong {
    color: var(--colour-risk);
  }

  .report {
    margin-block: 16px;
  }
</style>
