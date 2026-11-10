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

  const GLOBE = "globe";

  let { game }: { game: GameHome } = $props();

  type State =
    | { state: "reading" }
    | { state: "browser" }
    | { state: "none" }
    | { state: "catalogue-failed"; failure: import("../shell/types").Failure }
    | { state: "running"; entry: ReportEntry }
    | { state: "ran"; entry: ReportEntry; run: RunReading };

  let page = $state<State>({ state: "reading" });

  async function load() {
    page = { state: "reading" };
    const catalogue = await readCatalogue(game.id);
    if (catalogue.state === "browser") return (page = { state: "browser" });
    if (catalogue.state === "failed")
      return (page = { state: "catalogue-failed", failure: catalogue.failure });
    if (catalogue.state !== "ready") return;
    const entry = catalogue.entries.find((e) => e.surface === GLOBE);
    if (!entry) return (page = { state: "none" });
    page = { state: "running", entry };
    const run = await runReport(game.id, entry, DEFAULT_TOP);
    page = { state: "ran", entry, run };
  }

  onMount(load);
</script>

<div class="toolbar">
  <div class="eyebrow accent">{t("atlas-kicker")}</div>
  <button
    type="button"
    class="action"
    disabled={page.state === "reading" || page.state === "running"}
    onclick={load}>{t("atlas-read-again")}</button
  >
</div>
<h1>{t("atlas-title", { game: game.name })}</h1>

{#if page.state === "reading" || page.state === "running"}
  <p class="working" role="status">
    {t("atlas-reading")}
    <span class="muted">{t("atlas-reading-note")}</span>
  </p>
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
    <ReportView report={page.run.result.report} />
  {/if}
{/if}

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
  }

  h1 {
    margin-block: 4px 12px;
    font-family: var(--font-display);
    font-size: 2.25rem;
    font-weight: 600;
    line-height: 1.2;
  }

  .lead {
    max-width: 64ch;
    font-size: var(--type-lead);
  }

  .working {
    margin-bottom: 12px;
    color: var(--colour-comparison);
    font-weight: 600;
  }

  .working span {
    font-weight: 400;
  }
</style>
