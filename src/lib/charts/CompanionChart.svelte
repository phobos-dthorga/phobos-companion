<script lang="ts">
  /* A kit chart drawn through OptionChart, the one component that talks to ECharts. */
  import type { ChartBlockData } from "../reports/types";
  import { chartHeight, chartOptions } from "./chartOptions";
  import { readChartTheme } from "./chartTheme";
  import OptionChart from "./OptionChart.svelte";

  let {
    chart,
    label,
    onfailed,
  }: { chart: ChartBlockData; label: string; onfailed: () => void } = $props();
</script>

<OptionChart
  options={(reducedMotion) =>
    chartOptions(chart, readChartTheme(), reducedMotion)}
  height={chartHeight(chart)}
  {label}
  {onfailed}
/>
