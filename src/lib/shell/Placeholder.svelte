<script lang="ts">
  /**
   * The shape of what is coming while it loads (0.21.0): soft blocks where the picture or the list will be, with a slow sweep of
   * light, so nothing jumps when the real thing arrives in the same place. It says nothing to a screen reader; the progress bar
   * beside it does. With reduced motion the sweep stands still.
   */
  let {
    shape,
    rows = 5,
    height = 320,
  }: {
    /** A picture of blocks (treemap, globe), a chart with a band, or a list of rows. */
    shape: "blocks" | "chart" | "rows";
    rows?: number;
    height?: number;
  } = $props();
</script>

<div class="placeholder {shape}" aria-hidden="true" style:--height="{height}px">
  {#if shape === "blocks"}
    <div class="block big"></div>
    <div class="block"></div>
    <div class="block"></div>
    <div class="block"></div>
    <div class="block"></div>
  {:else if shape === "chart"}
    <div class="block band"></div>
  {:else}
    {#each Array.from({ length: rows }) as _, index (index)}
      <div class="block row" style:width="{100 - (index % 3) * 12}%"></div>
    {/each}
  {/if}
</div>

<style>
  .placeholder {
    margin-block: 8px 12px;
  }

  .blocks {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 6px;
    height: var(--height);
  }

  .blocks .big {
    grid-row: span 2;
  }

  .chart .band {
    height: var(--height);
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .row {
    height: 44px;
  }

  .block {
    position: relative;
    overflow: hidden;
    background: var(--colour-surface-soft);
    border-radius: 4px;
  }

  .block::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      transparent 30%,
      color-mix(in srgb, var(--colour-text) 7%, transparent) 50%,
      transparent 70%
    );
    animation: sweep 1.6s linear infinite;
  }

  @keyframes sweep {
    from {
      transform: translateX(-100%);
    }

    to {
      transform: translateX(100%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .block::after {
      animation: none;
      display: none;
    }
  }
</style>
