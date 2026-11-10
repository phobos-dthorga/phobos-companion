<script lang="ts">
  import { t } from "../i18n/runtime";
  import TableBlock from "../reports/TableBlock.svelte";
  import type { ChartBlockData, ChartRole } from "../reports/types";
  import { chartTable, formatValue } from "./chartOptions";
  import CompanionChart from "./CompanionChart.svelte";

  let { chart }: { chart: ChartBlockData } = $props();

  const id = $props.id();
  let failed = $state(false);
  let open = $state(false);

  const table = $derived(
    chartTable(chart, {
      category: t("chart-category"),
      value: t("chart-value"),
      kind: t("chart-kind"),
    }),
  );

  /** A role's colour from the theme; the words beside it carry the meaning. */
  function roleColour(role: ChartRole) {
    return `var(--colour-${role === "neutral" ? "text-muted" : role})`;
  }

  function cannotDraw() {
    failed = true;
    open = true;
  }
</script>

<figure>
  <figcaption>
    <span class="title">{chart.title}</span>
    <span class="description">{chart.description}</span>
  </figcaption>
  {#if failed}
    <p class="failed">{t("chart-failed")}</p>
  {:else}
    <CompanionChart
      {chart}
      label={t("chart-picture", {
        title: chart.title,
        description: chart.description,
      })}
      onfailed={cannotDraw}
    />
  {/if}
  {#if chart.series.length > 1 || chart.lines.length > 0}
    <ul class="key" aria-label={t("chart-key")}>
      {#if chart.series.length > 1}
        {#each chart.series as series, index (index)}
          <li>
            <span class="swatch" style:background={roleColour(series.role)}
            ></span>
            {series.label}
          </li>
        {/each}
      {/if}
      {#each chart.lines as line, index (index)}
        <li>
          <span class="dash" style:border-color={roleColour(line.role)}></span>
          {t("chart-line", {
            label: line.label,
            value: formatValue(line.value, chart.unit),
          })}
        </li>
      {/each}
    </ul>
  {/if}
  <button
    type="button"
    class="action"
    aria-expanded={open}
    aria-controls={`${id}-numbers`}
    onclick={() => (open = !open)}
  >
    {open ? t("chart-hide-numbers") : t("chart-show-numbers")}
  </button>
  {#if open}
    <div id={`${id}-numbers`} class="numbers">
      <TableBlock {table} />
    </div>
  {/if}
</figure>

<style>
  figure {
    margin: 0;
    padding: 14px 14px 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 6px;
  }

  figcaption {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 8px;
  }

  .title {
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .description,
  .failed {
    max-width: 80ch;
    color: var(--colour-text-muted);
    overflow-wrap: anywhere;
  }

  .numbers {
    margin-top: 10px;
  }

  .key {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    margin: 4px 0 8px;
    padding: 0;
    list-style: none;
    font-size: var(--type-small);
  }

  .key li {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .swatch {
    width: 14px;
    height: 14px;
    border-radius: 3px;
  }

  .dash {
    width: 22px;
    border-top: 3px dashed;
  }

  button {
    margin-top: 6px;
  }
</style>
