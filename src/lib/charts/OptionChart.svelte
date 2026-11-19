<script lang="ts">
  /*
   * The one component that talks to ECharts (Observatory's ADR-0003 and WyrmGrid's ADR-0004, adopted here). It is given the
   * options to draw, built by a pure function from the theme and whether motion is reduced; it never decides anything. ECharts
   * loads on demand; when it cannot, the parent shows the numbers instead.
   */
  import { onMount } from "svelte";
  import type { EChartsCoreOption, EChartsType } from "./echartsCore";

  let {
    options,
    height,
    label,
    onfailed,
  }: {
    options: (reducedMotion: boolean) => EChartsCoreOption;
    height: number;
    label: string;
    onfailed: () => void;
  } = $props();

  let container: HTMLDivElement;
  let instance = $state.raw<EChartsType | null>(null);
  let reducedMotion = $state(false);

  $effect(() => {
    instance?.setOption(options(reducedMotion), { notMerge: true });
  });

  onMount(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChanged = () => (reducedMotion = motion.matches);
    motionChanged();
    motion.addEventListener("change", motionChanged);
    import("./echartsCore")
      .then(({ init }) => {
        if (cancelled) return;
        const drawn = init(container, undefined, { renderer: "svg" });
        observer = new ResizeObserver(() => drawn.resize());
        observer.observe(container);
        instance = drawn;
      })
      .catch(() => {
        if (!cancelled) onfailed();
      });
    return () => {
      cancelled = true;
      motion.removeEventListener("change", motionChanged);
      observer?.disconnect();
      instance?.dispose();
      instance = null;
    };
  });
</script>

<div
  class="chart"
  bind:this={container}
  role="img"
  aria-label={label}
  style:height={`${height}px`}
></div>

<style>
  .chart {
    width: 100%;
    min-width: 0;
  }
</style>
