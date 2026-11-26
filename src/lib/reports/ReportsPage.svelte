<script lang="ts">
  import { here, setFocus } from "../navigation/navigation.svelte";
  import { onMount, tick, untrack } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import ReportView from "./ReportView.svelte";
  import { readCatalogue, runReport } from "./desktopClient";
  import { DEFAULT_TOP, hasMoreRows, MAX_TOP, nextTop } from "./presentation";
  import { watched } from "./watched.svelte";
  import { waitingFor } from "./watching";
  import type { CatalogueReading, ReportEntry, RunReading } from "./types";

  let { game }: { game: GameHome } = $props();

  let catalogue = $state<CatalogueReading>({ state: "reading" });
  let open = $state<ReportEntry | null>(null);
  let run = $state<RunReading | null>(null);
  let running = $state(false);
  let progress = $state(started());
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
    if (
      here().focus.command !== entry.command ||
      (here().focus.report ?? "") !== (entry.report ?? "")
    )
      setFocus({ command: entry.command, report: entry.report ?? "" });
    open = entry;
    top = limit;
    running = true;
    progress = started();
    copied = "idle";
    if (opening) run = null;
    const answer = await runReport(game.id, entry, limit, (message) => {
      if (mine === request) progress = heard(progress, message);
    });
    if (mine !== request) return;
    run = answer;
    running = false;
    if (opening) {
      await tick();
      heading?.focus();
    }
  }

  function back() {
    setFocus({ command: "", report: "" });
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

  /** A report the place names (a link, or Back) is run once the list of reports is read; none named closes it. */
  const focusReport = $derived(
    here().focus.command
      ? `${here().focus.command}/${here().focus.report ?? ""}`
      : null,
  );
  $effect(() => {
    if (catalogue.state !== "ready") return;
    const wanted = focusReport;
    untrack(() => {
      const current = open ? `${open.command}/${open.report ?? ""}` : null;
      if (wanted === current) return;
      if (!wanted) {
        back();
        return;
      }
      const entry =
        catalogue.state === "ready"
          ? catalogue.entries.find(
              (e) => `${e.command}/${e.report ?? ""}` === wanted,
            )
          : null;
      if (entry) void show(entry, DEFAULT_TOP);
    });
  });
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
    <ProgressBar {progress} fallback={t("reports-running")} />
    <p class="muted">{t("reports-running-note")}</p>
    <Placeholder shape="rows" rows={5} />
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
        {@const waiting = waitingFor(watched.found[game.id], entry)}
        <li>
          <button
            type="button"
            class="question"
            onclick={() => show(entry, DEFAULT_TOP)}
          >
            {entry.question}
            {#if waiting !== null}
              <span class="waiting"
                >{t("reports-waiting", { count: waiting })}</span
              >
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  h1:focus {
    outline: none;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    margin-bottom: 20px;
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

  .waiting {
    display: block;
    margin-top: 6px;
    font-weight: 600;
    color: var(--colour-accent);
  }
</style>
