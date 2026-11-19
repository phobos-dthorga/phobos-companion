/**
 * The only module that loads ECharts, and only the parts the window draws. CompanionChart imports it on demand, so
 * a report without charts never loads it and a failed load leaves the numbers on screen.
 */
import { init, use } from "echarts/core";
import { BarChart, LineChart, TreemapChart } from "echarts/charts";
import {
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";

use([
  BarChart,
  LineChart,
  TreemapChart,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  SVGRenderer,
]);

export { init };
export type { EChartsCoreOption, EChartsType } from "echarts/core";
