<script lang="ts">
  import { openDialog } from "../navigation/navigation.svelte";
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import RichText from "../shell/RichText.svelte";
  import WindowDialog from "../shell/WindowDialog.svelte";
  import { heard, started } from "../shell/progress";
  import type { EntryRequest } from "../code/types";
  import { commitRuns, plainText } from "../shell/inline";
  import { versionWords } from "../changelog/presentation";
  import { readAsItStood } from "./desktopClient";
  import { dayOf, dayWords, stoodEntries, timeWords } from "./presentation";
  import type { StoodEntry, StoodReading, StoodRequest } from "./types";

  /**
   * A changelog exactly as it stood at a commit or a moment, over the whole window, each entry marked by what has happened to it
   * since: reworded (with its words now) or taken out. Works for any game's repository, and for a changelog since removed.
   */
  let {
    game,
    request,
    onclose,
  }: { game: string; request: StoodRequest; onclose: () => void } = $props();

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

  function viewCode(next: EntryRequest) {
    openDialog({ kind: "code", request: next });
  }

  /** Opens the code viewer on the commit that wrote these entries, as the changelog stood then. */
  function showCode(version: string, run: StoodEntry[]) {
    const first = run[0];
    viewCode({
      repository: request.repository,
      changelog: request.changelog,
      product: request.product,
      entry: {
        version,
        section: first.section,
        text: first.text,
        lead: first.lead,
      },
      commit: first.commit ?? null,
    });
  }

  /** What a "show the code" button reads out: the entry it opens, and how many more the same commit wrote. */
  function codeLabel(run: StoodEntry[]) {
    return run.length > 1
      ? t("code-show-for-run", {
          entry: plainText(run[0].lead),
          more: run.length - 1,
        })
      : t("code-show-for", { entry: plainText(run[0].lead) });
  }

  onMount(() => {
    void load();
  });
</script>

<WindowDialog
  copyable
  kicker={t("stood-kicker", { product: request.product })}
  title={stood
    ? t("stood-title", {
        day: dayWords(dayOf(stood.commit.time)),
        time: timeWords(stood.commit.time),
      })
    : request.product}
  closeLabel={t("stood-close")}
  width={1100}
  {onclose}
>
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
      <div class="toggles" role="group" aria-label={t("stood-showing-label")}>
        <button
          type="button"
          class="toggle"
          aria-pressed={!changedOnly}
          onclick={() => (changedOnly = false)}>{t("stood-showing-all")}</button
        >
        <button
          type="button"
          class="toggle"
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
              {versionWords(version.version)}
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
              {@const runs = commitRuns(shown)}
              {#if runs.length > 1}
                <p class="muted small">
                  {t("changes-several-commits", { count: runs.length })}
                </p>
              {/if}
              {#each runs as run, runIndex (runIndex)}
                <div class:run={runs.length > 1}>
                  <ul class="entries">
                    {#each run as entry, index (index)}
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
                  {#if run[0].commit && stood}
                    <button
                      type="button"
                      class="action run-button"
                      aria-label={codeLabel(run)}
                      onclick={() => showCode(version.version, run)}
                    >
                      {run.length > 1
                        ? t("code-show-run", { count: run.length })
                        : t("code-show")}
                    </button>
                  {/if}
                </div>
              {/each}
            {/if}
          </section>
        {/if}
      {/each}
    </div>
  {/if}
</WindowDialog>

<style>
  h3 {
    margin: 0 0 6px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .about p {
    margin: 0 0 4px;
    font-size: var(--type-small);
    overflow-wrap: anywhere;
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

  .run {
    margin-block: 8px 12px;
    padding-inline-start: 12px;
    border-inline-start: 2px solid var(--colour-line);
  }

  .run-button {
    margin-top: 6px;
  }

  .since-removed .fate {
    border-color: var(--colour-risk);
  }
  .about .toggles {
    margin-top: 8px;
  }
</style>
