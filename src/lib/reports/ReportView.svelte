<script lang="ts">
  import GlobeBlock from "../atlas/GlobeBlock.svelte";
  import ChartBlock from "../charts/ChartBlock.svelte";
  import { t } from "../i18n/runtime";
  import { go } from "../navigation/navigation.svelte";
  import RichText from "../shell/RichText.svelte";
  import TableBlock from "./TableBlock.svelte";
  import { diffLine, headingTag } from "./presentation";
  import { refName, refWords } from "./refs";
  import type { Block, Ref, RefLink, Report } from "./types";

  /**
   * `globeCaption` is false where the page already says what its globe shows (the Atlas page puts the globe's description under
   * its title, 0.24.0). `quietLines` sets the opening lines small and muted where they are notes on the picture below, not the
   * answer (the Atlas page's). `link` (0.118.0) says where what a row or a finding is about opens (phobos-modkit 1.152.0's refs).
   */
  let {
    report,
    globeCaption = true,
    quietLines = false,
    link,
  }: {
    report: Report;
    globeCaption?: boolean;
    quietLines?: boolean;
    link?: RefLink;
  } = $props();

  /** A finding's refs that open somewhere, each once. */
  function linkedRefs(refs: Ref[]) {
    if (!link) return [];
    const seen = new Set<string>();
    return refs.flatMap((ref) => {
      const where = link(ref);
      const key = `${ref.kind} ${ref.id}`;
      if (!where || seen.has(key)) return [];
      seen.add(key);
      return [{ ref, where, key }];
    });
  }
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
  {:else if block.type === "findings"}
    <ol class="findings" aria-label={t("report-findings-label")}>
      {#each block.items as item, index (index)}
        <li class:risk={item.role === "risk"}>
          <span class="finding-text"><RichText text={item.text} /></span>
          {#each linkedRefs(item.refs) as to (to.key)}
            <button
              type="button"
              class="ref-chip"
              aria-label={t(refWords(to.ref, to.where.page === "changes"), {
                name: to.ref.id,
              })}
              onclick={() => go(to.where)}>{refName(to.ref)}</button
            >
          {/each}
        </li>
      {/each}
    </ol>
  {:else if block.type === "table"}
    <TableBlock table={block} {link} />
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

  /* The few things that matter most (0.118.0), each with the pages that answer what to do about it. */
  .findings {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 4px 0 12px;
    padding-inline-start: 24px;
  }

  .findings li {
    padding: 8px 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-inline-start: 4px solid var(--colour-accent);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .findings li.risk {
    border-inline-start-color: var(--colour-risk);
  }

  .finding-text {
    display: block;
    max-width: 90ch;
  }

  .ref-chip {
    min-height: var(--control-min);
    margin: 6px 6px 0 0;
    padding-inline: 10px;
    font: inherit;
    font-size: var(--type-small);
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    cursor: pointer;
  }

  .ref-chip:hover,
  .ref-chip:focus-visible {
    border-color: var(--colour-accent);
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
