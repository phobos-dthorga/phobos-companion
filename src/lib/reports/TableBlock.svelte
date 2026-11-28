<script lang="ts">
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import {
    cellText,
    isNumericColumn,
    nextSort,
    sortedIndexes,
  } from "./presentation";
  import { refAt, refWords } from "./refs";
  import type { RefLink, Sort, TableBlockData } from "./types";

  /**
   * `link` (0.118.0) says where a cell's ref opens, for a page whose reports say what each row is about (phobos-modkit 1.152.0):
   * such a cell is a link, and the rest stay plain text.
   */
  let { table, link }: { table: TableBlockData; link?: RefLink } = $props();

  function linked(row: number, column: number) {
    if (!link) return null;
    const ref = refAt(table.refs, row, column);
    const where = ref ? link(ref) : null;
    return ref && where ? { ref, where } : null;
  }

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
            {@const to = linked(row, column)}
            <td class:numeric={isNumericColumn(table, column)}
              >{#if to}<button
                  type="button"
                  class="ref"
                  title={t(refWords(to.ref, to.where.page === "changes"), {
                    name: to.ref.id,
                  })}
                  onclick={() => go(to.where)}>{cellText(cell)}</button
                >{:else}{cellText(cell)}{/if}</td
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

  /* A cell that opens what it names (0.118.0): looks like a link, and is a button for the keyboard. */
  .ref {
    min-height: var(--control-min);
    padding: 0;
    font: inherit;
    text-align: start;
    color: var(--colour-accent);
    background: none;
    border: none;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  .showing {
    margin-top: 8px;
    font-size: var(--type-small);
  }
</style>
