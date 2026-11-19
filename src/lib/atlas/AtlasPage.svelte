<script lang="ts">
  /*
   * The atlas: the report the kit marks as a globe for this game, on a page of its own. The page never names a game;
   * the kit's manifest says which report it is.
   */
  import { onMount } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import ReportView from "../reports/ReportView.svelte";
  import { readCatalogue, runReport } from "../reports/desktopClient";
  import { DEFAULT_TOP } from "../reports/presentation";
  import type { ReportEntry, RunReading } from "../reports/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";

  const GLOBE = "globe";
  /** About the globe's own height on a large window, so the page does not jump when it arrives. */
  const GLOBE_PLACEHOLDER_PX = 560;

  let { game }: { game: GameHome } = $props();

  type State =
    | { state: "reading" }
    | { state: "browser" }
    | { state: "none" }
    | { state: "catalogue-failed"; failure: import("../shell/types").Failure }
    | { state: "running"; entry: ReportEntry }
    | { state: "ran"; entry: ReportEntry; run: RunReading };

  let page = $state<State>({ state: "reading" });
  let progress = $state(started());

  async function load() {
    page = { state: "reading" };
    progress = started();
    const catalogue = await readCatalogue(game.id);
    if (catalogue.state === "browser") return (page = { state: "browser" });
    if (catalogue.state === "failed")
      return (page = { state: "catalogue-failed", failure: catalogue.failure });
    if (catalogue.state !== "ready") return;
    const entry = catalogue.entries.find((e) => e.surface === GLOBE);
    if (!entry) return (page = { state: "none" });
    page = { state: "running", entry };
    const run = await runReport(game.id, entry, DEFAULT_TOP, (message) => {
      progress = heard(progress, message);
    });
    page = { state: "ran", entry, run };
  }

  /** What the map shows, in the tools' own words, from the globe once it has been read. */
  const lead = $derived.by(() => {
    if (page.state !== "ran" || page.run.state === "failed") return "";
    const report = page.run.result.report;
    const blocks = [
      ...report.blocks,
      ...report.sections.flatMap((s) => s.blocks),
    ];
    const globe = blocks.find((b) => b.type === "globe");
    return globe && globe.type === "globe" ? globe.description : "";
  });

  onMount(load);
</script>

<!-- The title and Read again on one line, and what the map shows under them once it has been read (0.24.0). -->
<header class="head">
  <div class="titles">
    <div class="eyebrow accent">{t("atlas-kicker")}</div>
    <h1>{t("atlas-title", { game: game.name })}</h1>
    {#if lead}<p class="lead">{lead}</p>{/if}
  </div>
  <button
    type="button"
    class="action"
    disabled={page.state === "reading" || page.state === "running"}
    onclick={load}
    >{page.state === "reading" || page.state === "running"
      ? t("atlas-reading-button")
      : t("atlas-read-again")}</button
  >
</header>

{#if page.state === "reading" || page.state === "running"}
  <ProgressBar {progress} fallback={t("atlas-reading")} />
  <p class="muted">{t("atlas-reading-note")}</p>
  <Placeholder shape="globe" height={GLOBE_PLACEHOLDER_PX} />
{:else if page.state === "browser"}
  <p class="muted">{t("atlas-browser")}</p>
{:else if page.state === "none"}
  <p class="lead">{t("atlas-none", { game: game.name })}</p>
{:else if page.state === "catalogue-failed"}
  <FailurePanel failure={page.failure} onretry={load} />
{:else if page.state === "ran"}
  {#if page.run.state === "failed"}
    <FailurePanel failure={page.run.failure} onretry={load} />
  {:else}
    <ReportView
      report={page.run.result.report}
      globeCaption={false}
      quietLines
    />
  {/if}
{/if}

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px 16px;
    margin-bottom: 4px;
  }

  .titles {
    min-width: 0;
    flex: 1 1 32ch;
  }

  .head .action {
    flex: none;
    margin-top: 4px;
  }
</style>
