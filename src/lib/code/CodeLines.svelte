<script lang="ts">
  import { highlightLines } from "./highlightCore";
  import { escapeHtml } from "./presentation";

  /**
   * Lines of code, numbered as in their file and coloured by what each piece is (0.26.0, for Their code). The text reaches the
   * page escaped, by the highlighter or by `escapeHtml`; nothing else goes into `{@html}`.
   */
  let {
    lines,
    numbers,
    language,
    label,
  }: { lines: string[]; numbers: number[]; language: string; label: string } =
    $props();

  let painted = $state<string[] | null>(null);

  $effect(() => {
    const text = lines.join("\n");
    const kind = language;
    painted = null;
    void highlightLines(kind, text).then((html) => {
      if (lines.join("\n") === text) painted = html;
    });
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="code-lines code-colours"
  tabindex="0"
  role="region"
  aria-label={label}
>
  {#each lines as line, index (index)}
    <div class="line">
      <span class="number">{numbers[index] ?? ""}</span>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped by the highlighter, or by escapeHtml -->
      <code>{@html painted?.[index] ?? escapeHtml(line)}</code>
    </div>
  {/each}
</div>

<style>
  .code-lines {
    max-height: 70vh;
    overflow: auto;
    padding-block: 8px;
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: var(--type-small);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .line {
    display: grid;
    grid-template-columns: 5ch minmax(0, 1fr);
    gap: 12px;
  }

  .number {
    padding-inline-start: 8px;
    text-align: end;
    color: var(--colour-text-muted);
    user-select: none;
  }

  code {
    padding-inline-end: 16px;
    font: inherit;
    white-space: pre;
    tab-size: 4;
  }
</style>
