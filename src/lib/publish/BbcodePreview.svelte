<script lang="ts">
  import { t } from "../i18n/runtime";
  import { parseBbcode, type BbNode } from "./bbcode";

  /**
   * A Workshop page as Steam would show it, in the theme's colours (0.69.0). Drawn from the parsed tree as elements and text, never
   * as HTML; a link shows its address beside its words and is never followed from here.
   */
  let { text, label }: { text: string; label: string } = $props();

  const nodes = $derived(parseBbcode(text));
</script>

<div class="preview" role="region" aria-label={label}>
  {@render draw(nodes)}
</div>

{#snippet draw(list: BbNode[])}
  {#each list as node, index (index)}
    {#if node.kind === "text"}{node.text}{:else if node.kind === "h1"}<span
        class="h1">{@render draw(node.children)}</span
      >{:else if node.kind === "h2"}<span class="h2"
        >{@render draw(node.children)}</span
      >{:else if node.kind === "h3"}<span class="h3"
        >{@render draw(node.children)}</span
      >{:else if node.kind === "b"}<strong>{@render draw(node.children)}</strong
      >{:else if node.kind === "i"}<em>{@render draw(node.children)}</em
      >{:else if node.kind === "u"}<u>{@render draw(node.children)}</u
      >{:else if node.kind === "list"}<ul>
        {@render draw(node.children)}
      </ul>{:else if node.kind === "item"}<li>
        {@render draw(node.children)}
      </li>{:else if node.kind === "url"}<span class="link"
        >{@render draw(node.children)}<span class="address"
          >{t("publish-preview-link", { address: node.url ?? "" })}</span
        ></span
      >{/if}
  {/each}
{/snippet}

<style>
  .preview {
    min-height: 320px;
    max-height: 70vh;
    overflow: auto;
    padding: 14px 18px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--colour-text);
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .h1,
  .h2,
  .h3 {
    display: block;
    margin-block: 6px 4px;
    font-family: var(--font-display);
    font-weight: 600;
  }

  .h1 {
    font-size: 1.5rem;
  }

  .h2 {
    font-size: 1.25rem;
  }

  .h3 {
    font-size: 1.0625rem;
  }

  ul {
    margin: 2px 0 6px;
    padding-inline-start: 22px;
    white-space: normal;
  }

  li {
    white-space: pre-wrap;
  }

  .link {
    color: var(--colour-accent);
    text-decoration: underline;
  }

  .address {
    margin-inline-start: 4px;
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
    text-decoration: none;
  }
</style>
