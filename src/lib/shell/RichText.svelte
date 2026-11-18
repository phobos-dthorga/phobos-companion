<script lang="ts">
  import { inlineSegments } from "./inline";

  /** A line of changelog text with its **bold** and `code` shown as such. The text is never treated as markup. */
  let { text }: { text: string } = $props();

  const segments = $derived(inlineSegments(text));
</script>

<!-- prettier-ignore -->
{#each segments as segment, index (index)}{#if segment.style === "bold"}<strong>{segment.text}</strong>{:else if segment.style === "code"}<code>{segment.text}</code>{:else}{segment.text}{/if}{/each}

<style>
  code {
    padding-inline: 4px;
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: 0.92em;
    background: var(--colour-surface-soft);
    border-radius: 3px;
  }
</style>
