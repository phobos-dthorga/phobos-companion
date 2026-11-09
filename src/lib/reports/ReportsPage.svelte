<script lang="ts">
  import { onMount, tick } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ReportView from "./ReportView.svelte";
  import { readCatalogue, runReport } from "./desktopClient";
  import { DEFAULT_TOP, hasMoreRows, MAX_TOP, nextTop } from "./presentation";
  import type { CatalogueReading, ReportEntry, RunReading } from "./types";

  let { game }: { game: GameHome } = $props();

  let catalogue = $state<CatalogueReading>({ state: "reading" });
  let open = $state<ReportEntry | null>(null);
  let run = $state<RunReading | null>(null);
  let running = $state(false);
  let top = $state(DEFAULT_TOP);
  let copied = $state<"idle" | "done" | "failed">("idle");
  let heading = $state<HTMLElement | undefined>();
  let request = 0;

  async function load() {
    catalogue = { state: "reading" };
    catalogue = await readCatalogue(game.id);
  }

  /** Runs a report. A newer request wins, so a slow answer can't replace the one on screen. */
  async function show(entry: ReportEntry, limit: number) {
    const mine = ++request;
    const opening = open === null;
    open = entry;
    top = limit;
    running = true;
    copied = "idle";
    if (opening) run = null;
    const answer = await runReport(game.id, entry, limit);
    if (mine !== request) return;
    run = answer;
    running = false;
    if (opening) {
      await tick();
      heading?.focus();
    }
  }

  function back() {
    request += 1;
    open = null;
    run = null;
    running = false;
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = "done";
    } catch {
      copied = "failed";
    }
  }

  onMount(load);
</script>

{#if open}
  <div class="toolbar">
    <button type="button" class="action" onclick={back}>
      {t("action-back")}
    </button>
    {#if run?.state === "ready"}
      {@const line = run.result.command_line}
      <button type="button" class="action" onclick={() => copy(line)}>
        {t("action-copy")}
      </button>
      <span class="muted" role="status">
        {#if copied === "done"}{t("copy-done")}{:else if copied === "failed"}{t(
            "copy-failed",
          )}{/if}
      </span>
    {/if}
  </div>
  <div class="eyebrow accent">{t("reports-kicker")}</div>
  <h1 tabindex="-1" bind:this={heading}>{open.question}</h1>

  {#if running}
    <p class="working" role="status">
      {t("reports-running")}
      <span class="muted">{t("reports-running-note")}</span>
    </p>
  {/if}

  {#if run?.state === "failed"}
    <FailurePanel failure={run.failure} onretry={() => show(open!, top)} />
  {:else if run?.state === "ready"}
    <ReportView report={run.result.report} />
    {#if hasMoreRows(run.result.report) && top < MAX_TOP}
      <button
        type="button"
        class="action"
        disabled={running}
        onclick={() => show(open!, nextTop(top))}
      >
        {t("action-show-more")}
      </button>
    {/if}
  {/if}
{:else}
  <div class="eyebrow accent">{t("reports-kicker")}</div>
  <h1>{t("reports-title", { game: game.name })}</h1>
  {#if catalogue.state === "reading"}
    <p class="muted" role="status">{t("reports-loading")}</p>
  {:else if catalogue.state === "browser"}
    <p class="muted">{t("reports-browser")}</p>
  {:else if catalogue.state === "failed"}
    <FailurePanel failure={catalogue.failure} onretry={load} />
  {:else if catalogue.entries.length === 0}
    <p class="lead">{t("reports-empty", { game: game.name })}</p>
  {:else}
    <ul>
      {#each catalogue.entries as entry (`${entry.command}-${entry.report}`)}
        <li>
          <button
            type="button"
            class="question"
            onclick={() => show(entry, DEFAULT_TOP)}
          >
            {entry.question}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  h1 {
    margin-block: 4px 12px;
    font-family: var(--font-display);
    font-size: 2.25rem;
    font-weight: 600;
    line-height: 1.2;
  }

  h1:focus {
    outline: none;
  }

  .lead {
    max-width: 64ch;
    font-size: var(--type-lead);
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    margin-bottom: 20px;
  }

  .working {
    margin-bottom: 12px;
    color: var(--colour-comparison);
    font-weight: 600;
  }

  .working span {
    font-weight: 400;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
    gap: 10px;
  }

  .question {
    width: 100%;
    height: 100%;
    min-height: 64px;
    padding: 12px 16px;
    text-align: start;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .question:hover {
    border-color: var(--colour-comparison);
  }
</style>
