<script lang="ts">
  import { t } from "../i18n/runtime";
  import {
    cellText,
    isNumericColumn,
    nextSort,
    sortedIndexes,
  } from "./presentation";
  import type { Sort, TableBlockData } from "./types";

  let { table }: { table: TableBlockData } = $props();

  let sort = $state<Sort | null>(null);
  const order = $derived(sortedIndexes(table, sort));

  function ariaSort(column: number) {
    if (sort?.column !== column) return undefined;
    return sort.descending ? "descending" : "ascending";
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="scroll" tabindex="0" role="region" aria-label={t("table-region")}>
  <table>
    <thead>
      <tr>
        {#each table.headers as header, column (column)}
          <th aria-sort={ariaSort(column)}>
            <button
              type="button"
              class:numeric={isNumericColumn(table, column)}
              onclick={() => (sort = nextSort(table, sort, column))}
            >
              {header}
              {#if sort?.column === column}
                <span aria-hidden="true">{sort.descending ? "▼" : "▲"}</span>
              {/if}
            </button>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each order as row (row)}
        <tr>
          {#each table.rows[row] as cell, column (column)}
            <td class:numeric={isNumericColumn(table, column)}
              >{cellText(cell)}</td
            >
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
{#if table.total > table.rows.length}
  <p class="muted showing">
    {t("table-showing", { shown: table.rows.length, total: table.total })}
  </p>
{/if}

<style>
  .scroll {
    overflow-x: auto;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    background: var(--colour-surface-raised);
  }

  /* Columns take the width their words need and the table scrolls, so words are never broken mid-letter. */
  table {
    width: max-content;
    min-width: 100%;
    border-collapse: collapse;
    font-size: var(--type-small);
  }

  th {
    padding: 0;
    text-align: start;
    background: var(--colour-surface-soft);
    border-bottom: 1px solid var(--colour-line);
  }

  th button {
    width: 100%;
    min-height: var(--control-min);
    padding: 6px 12px;
    font: inherit;
    font-weight: 600;
    text-align: start;
    white-space: nowrap;
    color: var(--colour-text);
    background: transparent;
    border: none;
    cursor: pointer;
  }

  th button.numeric {
    text-align: end;
  }

  th span {
    color: var(--colour-accent);
  }

  td {
    padding: 8px 12px;
    vertical-align: top;
    border-top: 1px solid var(--colour-line);
    overflow-wrap: break-word;
    max-width: 48ch;
  }

  td.numeric {
    text-align: end;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .showing {
    margin-top: 8px;
    font-size: var(--type-small);
  }
</style>
