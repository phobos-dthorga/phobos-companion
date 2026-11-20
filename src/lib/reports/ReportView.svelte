<script lang="ts">
  import GlobeBlock from "../atlas/GlobeBlock.svelte";
  import ChartBlock from "../charts/ChartBlock.svelte";
  import { t } from "../i18n/runtime";
  import RichText from "../shell/RichText.svelte";
  import TableBlock from "./TableBlock.svelte";
  import { diffLine, headingTag } from "./presentation";
  import type { Block, Report } from "./types";

  /**
   * `globeCaption` is false where the page already says what its globe shows (the Atlas page puts the globe's description under
   * its title, 0.24.0). `quietLines` sets the opening lines small and muted where they are notes on the picture below, not the
   * answer (the Atlas page's).
   */
  let {
    report,
    globeCaption = true,
    quietLines = false,
  }: {
    report: Report;
    globeCaption?: boolean;
    quietLines?: boolean;
  } = $props();
</script>

{#snippet content(block: Block)}
  {#if block.type === "text"}
    <p class="text"><RichText text={block.text} /></p>
  {:else if block.type === "bullets"}
    <ul>
      {#each block.items as item, index (index)}
        <li>{item}</li>
      {/each}
    </ul>
  {:else if block.type === "table"}
    <TableBlock table={block} />
  {:else if block.type === "chart"}
    <ChartBlock chart={block} />
  {:else if block.type === "globe"}
    <GlobeBlock globe={block} caption={globeCaption} />
  {:else if block.language === "diff"}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <pre
      class="diff"
      tabindex="0"
      role="region"
      aria-label={t(
        "code-region",
      )}>{#each block.lines.map(diffLine) as line, index (index)}<span
          class="diff-line"
          class:diff-removed={line.kind === "removed"}
          class:diff-added={line.kind === "added"}
          class:diff-where={line.kind === "where"}
          ><span class="diff-sign" aria-hidden={line.sign ? undefined : "true"}
            >{line.sign || " "}</span
          >{line.text}</span
        >{/each}</pre>
  {:else}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <pre
      tabindex="0"
      role="region"
      aria-label={t("code-region")}>{block.lines.join("\n")}</pre>
  {/if}
{/snippet}

{#if report.facts && report.facts.length > 0}
  <div role="group" aria-label={t("report-facts")}>
    <dl class="facts">
      {#each report.facts as fact, index (index)}
        <div class="fact">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      {/each}
    </dl>
  </div>
{/if}

{#each report.lines as line, index (index)}
  <p class="line" class:quiet={quietLines}><RichText text={line} /></p>
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
  /* Where the report came from, as a strip of small cards (0.24.0), in place of a long opening sentence. */
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 4px 0 12px;
  }

  .fact {
    min-width: 0;
    padding: 6px 12px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .fact dt {
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
  }

  .fact dd {
    margin: 0;
    font-size: var(--type-small);
    overflow-wrap: anywhere;
  }

  .line {
    max-width: 80ch;
    margin-bottom: 6px;
    overflow-wrap: anywhere;
  }

  .quiet {
    font-size: var(--type-small);
    color: var(--colour-text-muted);
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

  /* A diff's lines fill the width, so a removed or added line's tint reads as one band (app.css .diff-removed, .diff-added). */
  pre.diff {
    padding-inline: 0;
  }

  .diff-line {
    display: block;
    min-width: max-content;
    padding-inline-end: 12px;
  }

  /* Unchanged lines keep the changed lines' indent; a changed line's bar comes from app.css, which this must not outrank. */
  .diff-line:not(.diff-removed):not(.diff-added) {
    border-inline-start: 6px solid transparent;
  }

  .diff-sign {
    display: inline-block;
    width: 3ch;
    text-align: center;
    user-select: none;
  }

  .diff-where {
    color: var(--colour-text-muted);
    background: var(--colour-surface-raised);
  }
</style>
