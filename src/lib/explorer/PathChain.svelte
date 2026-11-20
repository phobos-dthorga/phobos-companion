<script lang="ts">
  import { t } from "../i18n/runtime";
  import { formatMemory, rootWords } from "./presentation";
  import type { Opened } from "./snapshot.svelte";
  import type { Path } from "./types";

  /**
   * Why something is still in memory: one path from where the game keeps it (a static field, a thread, a handle) down to it, drawn
   * top to bottom. Each object on the way is a button that opens it; the field between two of them says how the one above holds
   * the one below. Plain HTML, read top to bottom.
   */
  let {
    path,
    label,
    onopen,
  }: {
    path: Path;
    label: string;
    onopen: (object: Opened) => void;
  } = $props();

  const start = $derived(rootWords(path));
</script>

<ol class="chain" aria-label={label}>
  <li class="root">
    <span class="mark" aria-hidden="true">●</span>
    <span>{t(start.key, start.args)}</span>
    {#if path.pinned}<span class="small muted"
        >{t("explorer-root-is-pinned")}</span
      >{/if}
    {#if path.skipped > 0}
      <span class="small muted"
        >{t("explorer-path-skipped", { count: path.skipped })}</span
      >
    {/if}
  </li>
  {#each path.links as link, index (index)}
    <li class="step">
      {#if link.field}
        <span class="through"
          >{t("explorer-path-through", { field: link.field })}</span
        >
      {/if}
      <button
        type="button"
        class="action object"
        class:target={index === path.links.length - 1}
        onclick={() =>
          onopen({
            address: link.address,
            type: link.type,
            summary: link.summary,
          })}
      >
        <span class="kind">{link.type}</span>
        {#if link.summary}<span class="muted">{link.summary}</span>{/if}
        <span class="small muted"
          >{link.address} · {formatMemory(link.size)}</span
        >
        {#if index === path.links.length - 1}
          <span class="small end">{t("explorer-path-end")}</span>
        {/if}
      </button>
    </li>
  {/each}
</ol>

<style>
  .chain {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 6px 0;
    padding: 0;
    list-style: none;
  }

  .root {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    font-weight: 600;
  }

  .mark {
    color: var(--colour-accent);
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    margin-inline-start: 6px;
    padding: 6px 0 6px 14px;
    border-inline-start: 2px solid var(--colour-line);
  }

  .through {
    font-size: var(--type-small);
    color: var(--colour-text-muted);
    overflow-wrap: anywhere;
  }

  .object {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    max-width: 100%;
    text-align: start;
    overflow-wrap: anywhere;
  }

  .object.target {
    border-color: var(--colour-accent);
  }

  .kind,
  .end {
    font-weight: 600;
  }
</style>
