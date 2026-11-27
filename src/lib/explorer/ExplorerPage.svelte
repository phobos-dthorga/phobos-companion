<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import { here } from "../navigation/navigation.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import RichText from "../shell/RichText.svelte";
  import { heard, started, type ProgressState } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import { register } from "../shortcuts/registry";
  import { formatClock } from "../memory/presentation";
  import { readOffer, runFrozenChecks } from "./desktopClient";
  import ChecksView from "./ChecksView.svelte";
  import KindView from "./KindView.svelte";
  import ObjectView from "./ObjectView.svelte";
  import OverviewView from "./OverviewView.svelte";
  import {
    clockOf,
    formatCount,
    releasedKey,
    secondsLeft,
    viewOf,
  } from "./presentation";
  import {
    explorer,
    letGo,
    openChecks,
    openedAs,
    openOverview,
    startFrozen,
    take,
  } from "./snapshot.svelte";
  import type { ChecksAnswer, OfferReading } from "./types";

  /**
   * The Explorer (owner's choice, 20 Nov 2026: "one explorer, two sources"; docs/debugging.md, layer 1): a look inside the running
   * game from a snapshot of its memory, taken only on the person's press and the confirmation in the card. The snapshot is held
   * by the host for ten minutes at most (owner's choice), and let go on Let it go or when this page closes. What is in memory by
   * kind and by who it belongs to, one kind's objects, one object in full, what holds it and why it is still in memory. Reading
   * saves here comes with the save explorer, not built yet, and is said in words. Any game whose tools offer a look inside (the
   * kit's `look-inside` surface) gets it; the rest are told so.
   *
   * The checks with the game frozen (0.102.0; the owner, 27 Nov 2026): when Windows has no room to copy the game for a snapshot
   * (error 1450), the tools read it in place instead, the game standing still for the whole read. One run on its own press and
   * confirmation, nothing held afterwards; its answer shows in the same checks view.
   */
  let { game }: { game: GameHome } = $props();

  let offer = $state<OfferReading>({ state: "reading" });
  let confirming = $state(false);
  let label = $state("");
  let taking = $state<ProgressState | null>(null);
  let takeRefusal = $state<string | null>(null);
  let takeFailure = $state<Failure | null>(null);
  let now = $state(Date.now());
  let confirmButton = $state<HTMLButtonElement | null>(null);
  let freezeConfirming = $state(false);
  let freezing = $state<ProgressState | null>(null);
  let frozen = $state<{ answer: ChecksAnswer; at: number } | null>(null);
  let frozenRefusal = $state<string | null>(null);
  let frozenFailure = $state<Failure | null>(null);
  let freezeButton = $state<HTMLButtonElement | null>(null);
  let browseConfirming = $state(false);
  let browseButton = $state<HTMLButtonElement | null>(null);

  const held = $derived(explorer.held?.game === game.id ? explorer.held : null);
  const view = $derived(
    viewOf(
      here().focus,
      held?.snapshot ?? null,
      (token) => openedAs(token) !== undefined,
    ),
  );
  const opened = $derived(
    view.name === "object" ? (openedAs(view.token) ?? null) : null,
  );
  const left = $derived(
    held ? secondsLeft(held.ready, held.receivedAt, now) : 0,
  );
  const available = $derived(
    offer.state === "ready" ? offer.offer.available : false,
  );
  const minutes = $derived(
    held ? Math.round(held.ready.limitSeconds / 60) : 10,
  );
  const canFreeze = $derived(
    offer.state === "ready" && offer.offer.frozen_checks,
  );
  const canBrowseFrozen = $derived(
    offer.state === "ready" && offer.offer.frozen_browse,
  );
  // Windows refused the copy a snapshot needs (error 1450): the frozen checks need none.
  const noRoom = $derived(takeRefusal !== null && takeRefusal.includes("1450"));

  onMount(() => {
    void readOffer(game.id).then((reading) => {
      offer = reading;
      if (here().focus.start === "yes") askToStart();
    });
    const timer = setInterval(() => (now = Date.now()), 1000);
    const unregister = register({
      scope: "explorer",
      inDialog: false,
      run: {
        "explorer.look": askToStart,
        "explorer.release": () => void letGo("asked"),
        "explorer.overview": () => {
          if (held) openOverview();
        },
        "explorer.checks": () => {
          if (held) openChecks();
        },
        "explorer.frozen": askToFreeze,
        "explorer.browse-frozen": askToBrowseFrozen,
      },
    });
    return () => {
      clearInterval(timer);
      unregister();
    };
  });

  // Leaving the page lets the snapshot go (owner's choice): it costs the game memory while it is held.
  onDestroy(() => {
    if (explorer.held) void letGo("left");
  });

  // The ten minutes are up: the host lets it go too, by its own clock.
  $effect(() => {
    if (held && !held.frozen && left <= 0) void letGo("limit");
  });

  $effect(() => {
    if (confirming) confirmButton?.focus();
  });

  $effect(() => {
    if (freezeConfirming) freezeButton?.focus();
  });

  $effect(() => {
    if (browseConfirming) browseButton?.focus();
  });

  function askToBrowseFrozen() {
    if (!canBrowseFrozen || held || taking || freezing) return;
    confirming = false;
    freezeConfirming = false;
    browseConfirming = true;
  }

  async function confirmBrowseFrozen() {
    browseConfirming = false;
    frozen = null;
    await startFrozen(game.id);
    openOverview();
  }

  function askToStart() {
    if (!available || taking || freezing) return;
    takeRefusal = null;
    takeFailure = null;
    freezeConfirming = false;
    confirming = true;
  }

  function askToFreeze() {
    if (!canFreeze || held || taking || freezing) return;
    frozenRefusal = null;
    frozenFailure = null;
    confirming = false;
    freezeConfirming = true;
  }

  async function confirmFreeze() {
    freezeConfirming = false;
    frozenRefusal = null;
    frozenFailure = null;
    freezing = started(t("explorer-bar-freezing"));
    const reading = await runFrozenChecks(game.id, (message) => {
      if (freezing) freezing = heard(freezing, message);
    });
    freezing = null;
    if (reading.state === "failed") frozenFailure = reading.failure;
    else if (reading.state === "ready") {
      const result = reading.frozen;
      if (!result.available)
        frozenRefusal = t("explorer-frozen-none", { game: game.name });
      else if (result.answer)
        frozen = { answer: result.answer, at: Date.now() };
      else frozenRefusal = result.refusal || t("explorer-take-no-reason");
    }
  }

  async function confirmStart() {
    confirming = false;
    takeRefusal = null;
    takeFailure = null;
    taking = started(t("explorer-bar-taking"));
    const reading = await take(game.id, label.trim(), (message) => {
      if (taking) taking = heard(taking, message);
    });
    taking = null;
    if (reading.state === "failed") takeFailure = reading.failure;
    else if (reading.state === "ready") {
      const taken = reading.taken;
      if (!taken.available)
        offer = {
          state: "ready",
          offer: {
            available: false,
            refusal: null,
            frozen_checks: false,
            frozen_browse: false,
          },
        };
      else if (taken.snapshot === null)
        takeRefusal = taken.refusal || t("explorer-take-no-reason");
      else openOverview();
    }
  }
</script>

<div class="eyebrow accent">{t("explorer-kicker")}</div>
<h1>{t("explorer-title", { game: game.name })}</h1>
<p class="lead">{t("explorer-lead")}</p>

{#if offer.state === "reading"}
  <Placeholder shape="rows" rows={3} />
{:else if offer.state === "browser"}
  <p class="lead">{t("explorer-browser")}</p>
{:else if offer.state === "failed"}
  <FailurePanel
    failure={offer.failure}
    onretry={() => void readOffer(game.id).then((r) => (offer = r))}
  />
{:else if offer.offer.refusal}
  <p class="said wrong" role="status">
    {t("explorer-offer-changed", { reason: offer.offer.refusal })}
  </p>
{:else if !offer.offer.available}
  <p class="lead">{t("explorer-none", { game: game.name })}</p>
{:else}
  <section class="sources" aria-labelledby="explorer-sources">
    <h2 id="explorer-sources">{t("explorer-sources-title")}</h2>
    <p><strong>{t("explorer-source-running")}</strong></p>
    <p class="small muted">{t("explorer-source-saves")}</p>
  </section>

  {#if held}
    <section class="panel live" aria-labelledby="explorer-held">
      {#if held.frozen}
        <h2 id="explorer-held">{t("explorer-frozen-held-title")}</h2>
        <p><RichText text={t("explorer-frozen-held-words")} /></p>
      {:else}
        <h2 id="explorer-held">{t("explorer-held-title")}</h2>
        <p>
          {t("explorer-held-figures", {
            when: formatClock(held.receivedAt / 1000),
            paused: formatCount(held.ready.snapshotMs),
          })}
        </p>
        <p class="left" role="timer" aria-live="off">
          {t("explorer-held-left", { clock: clockOf(left), minutes })}
        </p>
      {/if}
      <div class="buttons">
        <button
          type="button"
          class="move-button"
          onclick={() => void letGo("asked")}
          >{held.frozen
            ? t("explorer-frozen-stop-button")
            : t("explorer-let-go-button")}</button
        >
        {#if view.name !== "overview"}
          <button type="button" class="action" onclick={openOverview}
            >{t("explorer-overview-button")}</button
          >
        {/if}
        {#if view.name !== "checks"}
          <button type="button" class="action" onclick={openChecks}
            >{t("explorer-checks-button")}</button
          >
        {/if}
        <span class="small muted"
          >{held.frozen
            ? t("explorer-frozen-stop-how")
            : t("explorer-let-go-how")}</span
        >
      </div>
    </section>

    {#if view.name === "overview"}
      <OverviewView />
    {:else if view.name === "kind"}
      {#key view.kind}
        <KindView
          kind={view.kind}
          match={view.match}
          largest={view.largest}
          page={view.page}
        />
      {/key}
    {:else if view.name === "object" && opened}
      {#key view.token}
        <ObjectView object={opened} />
      {/key}
    {:else if view.name === "checks"}
      <ChecksView />
    {:else if view.name === "gone"}
      <p class="said" role="status">{t("explorer-gone-object")}</p>
    {/if}
  {:else}
    <section class="gotchas" aria-labelledby="explorer-gotchas">
      <h2 id="explorer-gotchas">{t("explorer-gotchas-title")}</h2>
      <ul>
        <li><RichText text={t("explorer-gotcha-save")} /></li>
        <li><RichText text={t("explorer-gotcha-pause")} /></li>
        <li><RichText text={t("explorer-gotcha-held")} /></li>
        <li><RichText text={t("explorer-gotcha-garbage")} /></li>
      </ul>
    </section>

    {#if explorer.letGo}
      <p class="said" role="status">
        {t(releasedKey(explorer.letGo.reason))}
        {#if explorer.letGo.detail}
          <span class="small muted">{explorer.letGo.detail}</span>
        {/if}
      </p>
    {/if}
    {#if view.name === "gone"}
      <p class="said" role="status">
        {view.was === "object"
          ? t("explorer-gone-object")
          : t("explorer-gone-kind")}
      </p>
    {/if}

    <section class="panel" aria-labelledby="explorer-start">
      <h2 id="explorer-start">{t("explorer-start-title")}</h2>
      <label class="label-field">
        <span class="small muted">{t("explorer-label-label")}</span>
        <input
          type="text"
          maxlength="80"
          bind:value={label}
          placeholder={t("explorer-label-placeholder")}
        />
      </label>
      {#if taking}
        <ProgressBar progress={taking} fallback={t("explorer-bar-taking")} />
      {:else if confirming}
        <div
          class="confirm"
          role="group"
          aria-label={t("explorer-confirm-label")}
        >
          <p class="confirm-question">{t("explorer-confirm-question")}</p>
          <p class="confirm-warning">
            <RichText text={t("explorer-confirm-words")} />
          </p>
          <div class="buttons">
            <button
              type="button"
              class="move-button"
              bind:this={confirmButton}
              onclick={() => void confirmStart()}
              >{t("explorer-confirm-yes")}</button
            >
            <button
              type="button"
              class="action"
              onclick={() => (confirming = false)}
              >{t("explorer-confirm-no")}</button
            >
          </div>
        </div>
      {:else}
        <div class="buttons">
          <button type="button" class="move-button" onclick={askToStart}
            >{t("explorer-look-button")}</button
          >
          <span class="small muted">{t("explorer-look-how")}</span>
        </div>
      {/if}
      {#if takeRefusal}
        <p class="said wrong" role="status">
          {t("explorer-take-refused", { reason: takeRefusal })}
        </p>
        {#if noRoom && canFreeze}
          <p class="said"><RichText text={t("explorer-no-room")} /></p>
        {/if}
      {/if}
      {#if takeFailure}
        <FailurePanel failure={takeFailure} onretry={askToStart} />
      {/if}
    </section>

    {#if canFreeze}
      <section class="panel" aria-labelledby="explorer-frozen">
        <h2 id="explorer-frozen">{t("explorer-frozen-title")}</h2>
        <p class="small"><RichText text={t("explorer-frozen-what")} /></p>
        {#if freezing}
          <ProgressBar
            progress={freezing}
            fallback={t("explorer-bar-freezing")}
          />
        {:else if freezeConfirming}
          <div
            class="confirm"
            role="group"
            aria-label={t("explorer-frozen-confirm-label")}
          >
            <p class="confirm-question">
              {t("explorer-frozen-confirm-question")}
            </p>
            <p class="confirm-warning">
              <RichText text={t("explorer-frozen-confirm-words")} />
            </p>
            <div class="buttons">
              <button
                type="button"
                class="move-button"
                bind:this={freezeButton}
                onclick={() => void confirmFreeze()}
                >{t("explorer-frozen-confirm-yes")}</button
              >
              <button
                type="button"
                class="action"
                onclick={() => (freezeConfirming = false)}
                >{t("explorer-confirm-no")}</button
              >
            </div>
          </div>
        {:else if browseConfirming}
          <div
            class="confirm"
            role="group"
            aria-label={t("explorer-browse-confirm-label")}
          >
            <p class="confirm-question">
              {t("explorer-browse-confirm-question")}
            </p>
            <p class="confirm-warning">
              <RichText text={t("explorer-browse-confirm-words")} />
            </p>
            <div class="buttons">
              <button
                type="button"
                class="move-button"
                bind:this={browseButton}
                onclick={() => void confirmBrowseFrozen()}
                >{t("explorer-browse-confirm-yes")}</button
              >
              <button
                type="button"
                class="action"
                onclick={() => (browseConfirming = false)}
                >{t("explorer-confirm-no")}</button
              >
            </div>
          </div>
        {:else}
          <div class="buttons">
            <button type="button" class="action" onclick={askToFreeze}
              >{t("explorer-frozen-button")}</button
            >
            <span class="small muted">{t("explorer-frozen-how")}</span>
          </div>
          {#if canBrowseFrozen}
            <div class="buttons">
              <button type="button" class="action" onclick={askToBrowseFrozen}
                >{t("explorer-browse-button")}</button
              >
              <span class="small muted">{t("explorer-browse-how")}</span>
            </div>
          {/if}
        {/if}
        {#if frozenRefusal}
          <p class="said wrong" role="status">
            {t("explorer-frozen-refused", { reason: frozenRefusal })}
          </p>
        {/if}
        {#if frozenFailure}
          <FailurePanel failure={frozenFailure} onretry={askToFreeze} />
        {/if}
      </section>
    {/if}

    {#if frozen}
      {#key frozen.at}
        <ChecksView given={frozen.answer} frozenAt={frozen.at} />
      {/key}
    {/if}
  {/if}
{/if}

<style>
  .gotchas,
  .panel,
  .sources {
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

  .sources p {
    margin: 2px 0;
  }

  .live {
    border: 2px solid var(--colour-accent);
  }

  h2 {
    margin: 0 0 8px;
    font-size: var(--type-body);
  }

  .left {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .label-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-block: 8px 12px;
    max-width: 60ch;
  }

  input[type="text"] {
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
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
    margin-block: 8px;
  }

  .said.wrong {
    color: var(--colour-risk);
  }
</style>
