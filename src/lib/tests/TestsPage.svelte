<script lang="ts">
  import { onMount } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import { readTestLists, recordVerdict } from "./desktopClient";
  import {
    formatDay,
    lastSighting,
    onShelf,
    SHELF_WORDS,
    SHELVES,
    steps,
    VERDICT_WORDS,
    type Shelf,
  } from "./presentation";
  import type { TestList, TestRow, TestsReading, VerdictWord } from "./types";

  let { game }: { game: GameHome } = $props();

  let reading = $state<TestsReading>({ state: "reading" });
  let shelf = $state<Shelf>("seen");
  let noting = $state<string | null>(null);
  let notes = $state<Record<string, string>>({});
  let busy = $state<string | null>(null);
  let said = $state("");

  async function load() {
    reading = { state: "reading" };
    reading = await readTestLists(game.id);
    if (reading.state === "ready") {
      const rows = reading.lists.flatMap((list) => list.rows);
      shelf = SHELVES.find((s) => onShelf(rows, s).length > 0) ?? "waiting";
    }
  }

  function count(lists: TestList[], which: Shelf): number {
    return lists.reduce(
      (sum, list) => sum + onShelf(list.rows, which).length,
      0,
    );
  }

  /** Records a verdict, then shows it at once; the host's answer decides whether it stands. */
  async function judge(list: TestList, row: TestRow, verdict: VerdictWord) {
    const key = `${list.repository}/${row.id}`;
    busy = key;
    const note = verdict === "cleared" ? "" : (notes[key] ?? "").trim();
    const answer = await recordVerdict(
      game.id,
      list.repository,
      row.id,
      verdict,
      note,
    );
    busy = null;
    if (answer.state === "failed") {
      said = t("tests-record-failed", { row: row.id });
      reading = { state: "failed", failure: answer.failure };
      return;
    }
    if (verdict === "cleared") {
      row.verdict = null;
      row.pending = null;
    } else {
      row.verdict = { verdict, time: answer.recorded.time, note };
      row.pending = verdict;
    }
    noting = null;
    said = t(VERDICT_WORDS[verdict].recorded, { row: row.id });
  }

  onMount(load);
</script>

<div class="eyebrow accent">{t("tests-kicker")}</div>
<h1>{t("tests-title", { game: game.name })}</h1>
<p class="lead">{t("tests-lead")}</p>

<p class="status" role="status" aria-live="polite">{said}</p>

{#if reading.state === "reading"}
  <p class="muted" role="status">{t("tests-reading")}</p>
{:else if reading.state === "browser"}
  <p class="muted">{t("tests-browser")}</p>
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={load} />
{:else if reading.lists.length === 0}
  <p class="lead">{t("tests-none", { game: game.name })}</p>
{:else}
  {@const lists = reading.lists}
  <div class="shelves" role="group" aria-label={t("tests-shelves-label")}>
    {#each SHELVES as which (which)}
      <button
        type="button"
        class="shelf"
        aria-pressed={shelf === which}
        onclick={() => (shelf = which)}
      >
        {t(SHELF_WORDS[which].label, { count: count(lists, which) })}
      </button>
    {/each}
  </div>
  <p class="muted shelf-note">{t(SHELF_WORDS[shelf].note)}</p>

  {#each lists as list (list.repository)}
    {@const rows = onShelf(list.rows, shelf)}
    {#if lists.length > 1}
      <h2 class="repository">{list.repository}</h2>
    {/if}
    {#if rows.length === 0}
      <p class="muted">{t("tests-shelf-empty")}</p>
    {:else}
      <ol class="rows">
        {#each rows as row (row.id)}
          {@const key = `${list.repository}/${row.id}`}
          {@const seen = lastSighting(row)}
          {@const what = steps(row)}
          <li>
            <article class="row" aria-labelledby={`row-${key}`}>
              <h3 id={`row-${key}`}>
                <span class="number">{row.id}</span>
                {row.title}
              </h3>
              <p class="muted section">{row.section}</p>
              {#if row.verdict}
                <p
                  class="verdict"
                  class:failed={row.verdict.verdict === "failed"}
                >
                  {t(VERDICT_WORDS[row.verdict.verdict].shown, {
                    day: formatDay(row.verdict.time),
                  })}
                  {#if row.verdict.note}<span class="note"
                      >“{row.verdict.note}”</span
                    >{/if}
                </p>
              {/if}
              {#if seen}
                <p class="seen">
                  {t("tests-seen", {
                    day: formatDay(seen.last),
                    detail: seen.detail || "—",
                    made: `${seen.mod} ${seen.version}`.trim(),
                  })}
                </p>
              {/if}
              <dl>
                <dt>{t("tests-what-to-do")}</dt>
                <dd>{what.todo}</dd>
                <dt>{t("tests-what-passes")}</dt>
                <dd>{what.passes}</dd>
              </dl>
              {#if noting === key}
                <label class="note-field">
                  {t("tests-note-label")}
                  <input type="text" maxlength="300" bind:value={notes[key]} />
                </label>
              {/if}
              <div class="buttons">
                <button
                  type="button"
                  class="verdict-button passed"
                  disabled={busy !== null}
                  onclick={() => judge(list, row, "passed")}
                >
                  <span aria-hidden="true">✓</span>
                  {t("tests-action-passed")}
                </button>
                <button
                  type="button"
                  class="verdict-button failed"
                  disabled={busy !== null}
                  onclick={() => judge(list, row, "failed")}
                >
                  <span aria-hidden="true">✕</span>
                  {t("tests-action-failed")}
                </button>
                {#if noting !== key}
                  <button
                    type="button"
                    class="action"
                    onclick={() => (noting = key)}
                  >
                    {t("tests-action-note")}
                  </button>
                {/if}
                {#if row.verdict}
                  <button
                    type="button"
                    class="action"
                    disabled={busy !== null}
                    onclick={() => judge(list, row, "cleared")}
                  >
                    {t("tests-action-undo")}
                  </button>
                {/if}
              </div>
            </article>
          </li>
        {/each}
      </ol>
    {/if}
  {/each}
  <p class="muted how">{t("tests-how-written")}</p>
{/if}

<style>
  h1 {
    margin-block: 4px 8px;
    font-family: var(--font-display);
    font-size: 2.25rem;
    font-weight: 600;
    line-height: 1.2;
  }

  .lead {
    max-width: 70ch;
    font-size: var(--type-lead);
  }

  .status {
    min-height: 1.5em;
    margin-block: 8px;
    font-weight: 600;
    color: var(--colour-observed);
  }

  .shelves {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .shelf {
    min-height: var(--control-min);
    padding-inline: 18px;
    font: inherit;
    color: var(--colour-text-muted);
    background: transparent;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .shelf[aria-pressed="true"] {
    font-weight: 600;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
  }

  .shelf-note {
    margin-block: 8px 16px;
    font-size: var(--type-small);
  }

  .repository {
    margin-block: 20px 8px;
    font-family: var(--font-display);
    font-size: 1.25rem;
  }

  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .row {
    padding: 16px 18px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h3 {
    margin: 0;
    font-size: var(--type-lead);
    font-weight: 600;
  }

  .number {
    display: inline-block;
    min-width: 3ch;
    margin-inline-end: 8px;
    color: var(--colour-accent);
  }

  .section {
    margin-block: 2px 8px;
    font-size: var(--type-caption);
  }

  .seen {
    margin-block: 8px;
    padding: 8px 12px;
    color: var(--colour-text);
    border-inline-start: 4px solid var(--colour-observed);
    background: var(--colour-surface-soft);
  }

  .verdict {
    margin-block: 8px;
    font-weight: 600;
    color: var(--colour-success);
  }

  .verdict.failed {
    color: var(--colour-risk);
  }

  .note {
    margin-inline-start: 6px;
    font-weight: 400;
    color: var(--colour-text);
  }

  dl {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 6px 14px;
    margin-block: 10px;
    font-size: var(--type-small);
  }

  dt {
    font-weight: 600;
    color: var(--colour-text-muted);
  }

  dd {
    margin: 0;
    max-width: 90ch;
  }

  .note-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-block: 8px;
    font-size: var(--type-small);
  }

  .note-field input {
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }

  .verdict-button {
    min-height: var(--control-min);
    min-width: 120px;
    padding-inline: 20px;
    font: inherit;
    font-weight: 600;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .verdict-button.passed {
    border-color: var(--colour-success);
  }

  .verdict-button.failed {
    border-color: var(--colour-risk);
  }

  .verdict-button:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .how {
    margin-top: 20px;
    font-size: var(--type-small);
    max-width: 80ch;
  }
</style>
