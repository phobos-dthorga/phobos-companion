<script lang="ts">
  import { t } from "../i18n/runtime";
  import TableBlock from "./TableBlock.svelte";
  import { headingTag } from "./presentation";
  import type { Block, Report } from "./types";

  let { report }: { report: Report } = $props();
</script>

{#snippet content(block: Block)}
  {#if block.type === "text"}
    <p class="text">{block.text}</p>
  {:else if block.type === "bullets"}
    <ul>
      {#each block.items as item, index (index)}
        <li>{item}</li>
      {/each}
    </ul>
  {:else if block.type === "table"}
    <TableBlock table={block} />
  {:else}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <pre
      tabindex="0"
      role="region"
      aria-label={t("code-region")}>{block.lines.join("\n")}</pre>
  {/if}
{/snippet}

{#each report.lines as line, index (index)}
  <p class="line">{line}</p>
{/each}

{#each report.blocks as block, index (index)}
  <div class="block">{@render content(block)}</div>
{/each}

{#each report.sections as section, index (index)}
  <section>
    <svelte:element this={headingTag(section.level)} class="heading">
      {section.heading}
    </svelte:element>
    {#each section.blocks as block, blockIndex (blockIndex)}
      <div class="block">{@render content(block)}</div>
    {/each}
    {#if section.blocks.length === 0}
      <p class="muted">{t("report-section-empty")}</p>
    {/if}
  </section>
{/each}

<style>
  .line {
    max-width: 80ch;
    margin-bottom: 6px;
    overflow-wrap: anywhere;
  }

  section {
    margin-top: 24px;
  }

  .heading {
    margin: 0 0 10px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  .block {
    margin-bottom: 12px;
  }

  .text {
    max-width: 80ch;
    overflow-wrap: anywhere;
  }

  ul {
    margin: 0;
    padding-inline-start: 22px;
  }

  li {
    margin-bottom: 4px;
    overflow-wrap: anywhere;
  }

  pre {
    margin: 0;
    padding: 12px;
    overflow-x: auto;
    font-size: var(--type-small);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }
</style>
