<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import RichText from "../shell/RichText.svelte";
  import { heard, started } from "../shell/progress";
  import { readAsItStood } from "./desktopClient";
  import { dayOf, dayWords, stoodEntries, timeWords } from "./presentation";
  import type { StoodReading, StoodRequest } from "./types";

  /**
   * A changelog exactly as it stood at a commit or a moment, over the whole window, each entry marked by what has happened to it
   * since: reworded (with its words now) or taken out. Works for any game's repository, and for a changelog since removed.
   */
  let {
    game,
    request,
    onclose,
  }: { game: string; request: StoodRequest; onclose: () => void } = $props();

  let dialog: HTMLDialogElement;
  let reading = $state<StoodReading>({ state: "reading" });
  let progress = $state(started());
  let changedOnly = $state(false);

  const stood = $derived(
    reading.state === "ready" && reading.found.found
      ? reading.found.stood
      : null,
  );

  async function load() {
    reading = { state: "reading" };
    progress = started();
    reading = await readAsItStood(game, request, (message) => {
      progress = heard(progress, message);
    });
  }

  onMount(() => {
    dialog.showModal();
    void load();
  });
</script>

<dialog
  bind:this={dialog}
  class="viewer"
  aria-labelledby="stood-title"
  {onclose}
>
  <header class="head">
    <div class="head-words">
      <div class="eyebrow accent">
        {t("stood-kicker", { product: request.product })}
      </div>
      <h2 id="stood-title">
        {stood
          ? t("stood-title", {
              day: dayWords(dayOf(stood.commit.time)),
              time: timeWords(stood.commit.time),
            })
          : request.product}
      </h2>
    </div>
    <button type="button" class="action close" onclick={() => dialog.close()}
      >{t("stood-close")}</button
    >
  </header>

  {#if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("stood-reading")} />
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={load} />
  {:else if !reading.found.found}
    <p class="lead">
      {t("stood-refused", { reason: reading.found.refusal ?? "" })}
    </p>
  {:else if stood}
    <div class="about">
      <p class="muted">
        {t("stood-commit", {
          hash: stood.commit.hash.slice(0, 8),
          author: stood.commit.author,
          subject: stood.commit.subject,
        })}
      </p>
      <p>
        {t("stood-since", {
          added: stood.since.added,
          reworded: stood.since.reworded,
          removed: stood.since.removed,
        })}
      </p>
      {#if !stood.stillThere}
        <p class="muted">{t("stood-gone")}</p>
      {/if}
      <div class="choices" role="group" aria-label={t("stood-showing-label")}>
        <button
          type="button"
          class="choice"
          aria-pressed={!changedOnly}
          onclick={() => (changedOnly = false)}>{t("stood-showing-all")}</button
        >
        <button
          type="button"
          class="choice"
          aria-pressed={changedOnly}
          onclick={() => (changedOnly = true)}
          >{t("stood-showing-changed")}</button
        >
      </div>
    </div>

    <div class="body">
      {#each stood.versions as version (version.version)}
        {@const shown = stoodEntries(version.entries, changedOnly)}
        {#if !changedOnly || shown.length > 0}
          <section class="version" aria-label={version.version}>
            <h3>
              {version.version === "Unreleased"
                ? t("changes-unreleased")
                : version.version}
              {#if version.heading}<span class="muted heading-rest"
                  >{version.heading}</span
                >{/if}
            </h3>
            {#if version.summary && !changedOnly}
              <p class="summary">{version.summary}</p>
            {/if}
            {#if shown.length === 0}
              <p class="muted small">{t("changes-no-entries")}</p>
            {:else}
              <ul class="entries">
                {#each shown as entry, index (index)}
                  <li class="since-{entry.since}">
                    {#if entry.section}<span class="section muted"
                        >{entry.section}</span
                      >{/if}
                    <RichText text={entry.text} />
                    {#if entry.since === "reworded"}
                      <p class="fate">
                        <span aria-hidden="true">✎</span>
                        {t("stood-reworded")}
                        <RichText text={entry.now ?? ""} />
                      </p>
                    {:else if entry.since === "removed"}
                      <p class="fate">
                        <span aria-hidden="true">✖</span>
                        {t("stood-removed")}
                      </p>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </section>
        {/if}
      {/each}
    </div>
  {/if}
</dialog>

<style>
  .viewer {
    width: min(1100px, 96vw);
    height: 92vh;
    max-width: none;
    max-height: none;
    padding: 20px 24px;
    color: var(--colour-text);
    background: var(--colour-surface);
    border: 2px solid var(--colour-accent);
    border-radius: 6px;
  }

  .viewer[open] {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .viewer::backdrop {
    background: rgb(0 0 0 / 70%);
  }

  .head {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }

  .head-words {
    flex: 1;
    min-width: 0;
  }

  h2 {
    margin: 2px 0 4px;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.25;
  }

  h3 {
    margin: 0 0 6px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .close {
    flex: none;
  }

  .about p {
    margin: 0 0 4px;
    font-size: var(--type-small);
    overflow-wrap: anywhere;
  }

  .lead {
    font-size: var(--type-lead);
  }

  .small {
    font-size: var(--type-small);
  }

  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .choice {
    min-height: var(--control-min);
    padding-inline: 14px;
    font: inherit;
    color: var(--colour-text-muted);
    background: transparent;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .choice[aria-pressed="true"] {
    font-weight: 600;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
  }

  .body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-inline-end: 6px;
  }

  .version {
    margin-top: 12px;
    padding: 12px 16px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .heading-rest {
    margin-inline-start: 10px;
    font-family: var(--font-body, inherit);
    font-size: var(--type-small);
    font-weight: 400;
  }

  .summary {
    margin: 0 0 8px;
    font-size: var(--type-small);
  }

  .entries {
    margin: 0;
    padding-inline-start: 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: var(--type-small);
  }

  .section {
    margin-inline-end: 6px;
    font-size: var(--type-caption);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .fate {
    margin: 2px 0 0;
    padding-inline-start: 10px;
    border-inline-start: 2px solid var(--colour-observed);
  }

  .since-removed .fate {
    border-color: var(--colour-risk);
  }
</style>
