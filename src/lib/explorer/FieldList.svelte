<script lang="ts">
  import { t } from "../i18n/runtime";
  import FieldList from "./FieldList.svelte";
  import type { Opened } from "./snapshot.svelte";
  import type { Field } from "./types";

  /**
   * Every value an object holds, as the reader gave it: numbers and true or false as written, text in quotes, enums by name, a
   * struct opened beneath it, nothing as "nothing", and another object as a button that opens it. Plain HTML, read top to bottom.
   */
  let {
    fields,
    label,
    onopen,
  }: {
    fields: Field[];
    /** What the list is, in words, for a screen reader. */
    label: string;
    onopen: (object: Opened) => void;
  } = $props();
</script>

<ul class="fields" aria-label={label}>
  {#each fields as field, index (index)}
    <li>
      <div class="line">
        <span class="name">{field.name}</span>
        <span class="type">{field.type}</span>
        {#if field.kind === "value"}
          <span class="value">{field.value}</span>
        {:else if field.kind === "text"}
          <q class="text">{field.value}</q>
        {:else if field.kind === "null"}
          <span class="nothing">{t("explorer-value-nothing")}</span>
        {:else if field.kind === "unreadable"}
          <span class="nothing"
            >{t("explorer-value-unreadable", {
              why: field.value ?? "",
            })}</span
          >
        {:else if field.kind === "link" && field.address}
          <button
            type="button"
            class="action link"
            onclick={() =>
              onopen({
                address: field.address ?? "",
                type: field.valueType ?? field.type,
                summary: field.summary ?? "",
              })}
          >
            <span>{field.valueType ?? field.type}</span>
            {#if field.summary}<span class="summary">{field.summary}</span>{/if}
          </button>
        {:else if field.kind === "struct" && !field.fields}
          <span class="nothing">{field.value ?? ""}</span>
        {/if}
      </div>
      {#if field.kind === "struct" && field.fields}
        <div class="inner">
          <FieldList
            fields={field.fields}
            label={t("explorer-struct-label", { name: field.name })}
            {onopen}
          />
        </div>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .fields {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 10px;
    min-height: var(--control-min);
    padding-block: 2px;
    border-bottom: 1px solid var(--colour-line);
    overflow-wrap: anywhere;
  }

  .name {
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-weight: 600;
  }

  .type {
    font-size: var(--type-small);
    color: var(--colour-text-muted);
  }

  .value {
    font-variant-numeric: tabular-nums;
  }

  .text {
    white-space: pre-wrap;
  }

  .nothing {
    color: var(--colour-text-muted);
    font-style: italic;
  }

  .link {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 2px 8px;
    text-align: start;
  }

  .summary {
    color: var(--colour-text-muted);
  }

  .inner {
    margin-inline-start: 16px;
    padding-inline-start: 10px;
    border-inline-start: 2px solid var(--colour-line);
  }
</style>
