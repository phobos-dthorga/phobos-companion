import type {
  ChartBlockData,
  ChartRole,
  TableBlockData,
} from "../reports/types";

/** The theme's colours a chart uses, read from the page's CSS variables. */
export type ChartTheme = {
  roles: Record<ChartRole, string>;
  text: string;
  muted: string;
  line: string;
  surface: string;
  /** The page's own font, so ECharts measures text the way the page draws it. */
  font: string;
};

/** The smallest text a chart draws, the window's type floor. */
export const CHART_FONT_PX = 13;
const BAR_HEIGHT_PX = 28;
const CHART_FRAME_PX = 96;
const LINE_CHART_PX = 320;
const MOTION_MS = 400;

/** How tall a chart needs to be: bars running sideways take one row each. */
export function chartHeight(chart: ChartBlockData): number {
  if (chart.kind === "line") return LINE_CHART_PX;
  return Math.max(
    160,
    chart.categories.length * BAR_HEIGHT_PX + CHART_FRAME_PX,
  );
}

/** A value as the report writes it: % sits against the number, other units follow a space. */
export function formatValue(value: number | null, unit: string): string {
  if (value === null) return "";
  const rounded =
    Number.isInteger(value) || Math.abs(value) >= 100
      ? Math.round(value).toLocaleString("en-AU")
      : value.toLocaleString("en-AU", { maximumFractionDigits: 1 });
  if (!unit) return rounded;
  return unit === "%" ? `${rounded}%` : `${rounded} ${unit}`;
}

/** When each category holds one value, the series is only a kind of value (a risk band), not a second number. */
export function oneValuePerCategory(chart: ChartBlockData): boolean {
  return chart.categories.every(
    (_, i) => chart.series.filter((s) => s.values[i] !== null).length <= 1,
  );
}

/** The chart's numbers as a table the window can sort: the path that never needs a pointer. */
export function chartTable(
  chart: ChartBlockData,
  labels: { category: string; value: string; kind: string },
): TableBlockData {
  const valueHeader = chart.value_label || labels.value;
  if (oneValuePerCategory(chart) && chart.kind === "bar") {
    const several = chart.series.length > 1;
    const rows = chart.categories.map((category, i) => {
      const found = chart.series.find((s) => s.values[i] !== null);
      const value = found ? found.values[i] : null;
      const cells = [category, formatValue(value, chart.unit)];
      return {
        cells: several ? [...cells, found?.label ?? ""] : cells,
        value,
      };
    });
    return {
      type: "table",
      headers: [
        labels.category,
        valueHeader,
        ...(several ? [labels.kind] : []),
      ],
      rows: rows.map((r) => r.cells),
      values: rows.map((r) =>
        several ? [null, r.value, null] : [null, r.value],
      ),
      total: rows.length,
    };
  }
  return {
    type: "table",
    headers: [labels.category, ...chart.series.map((s) => s.label)],
    rows: chart.categories.map((category, i) => [
      category,
      ...chart.series.map((s) => formatValue(s.values[i], chart.unit)),
    ]),
    values: chart.categories.map((_, i) => [
      null,
      ...chart.series.map((s) => s.values[i]),
    ]),
    total: chart.categories.length,
  };
}

const text = (theme: ChartTheme, colour = theme.text) => ({
  color: colour,
  fontSize: CHART_FONT_PX,
  fontFamily: theme.font,
});

/**
 * ECharts options for a kit chart: plain data only, so this stays testable without a browser.
 * Bars run sideways, first category on top, each with its value at its end. The key to series and reference lines is
 * the page's own text under the chart (ChartBlock), so it is read aloud and drawn in the page's font.
 */
export function chartOptions(
  chart: ChartBlockData,
  theme: ChartTheme,
  reducedMotion: boolean,
): Record<string, unknown> {
  const sideways = chart.kind === "bar";
  const categoryAxis = {
    type: "category",
    data: chart.categories,
    inverse: sideways,
    axisLabel: { ...text(theme), width: 200, overflow: "truncate" },
    axisLine: { lineStyle: { color: theme.line } },
    axisTick: { show: false },
  };
  const valueAxis = {
    type: "value",
    name: chart.value_label || undefined,
    nameLocation: "middle",
    nameGap: 28,
    nameTextStyle: text(theme, theme.muted),
    axisLabel: {
      ...text(theme, theme.muted),
      formatter: (value: number) => formatValue(value, chart.unit),
    },
    splitLine: { lineStyle: { color: theme.line, type: "dashed" } },
  };
  const markLine = chart.lines.length
    ? {
        silent: true,
        symbol: "none",
        animation: false,
        data: chart.lines.map((line) => ({
          [sideways ? "xAxis" : "yAxis"]: line.value,
          name: line.label,
          lineStyle: {
            color: theme.roles[line.role],
            type: "dashed",
            width: 2,
          },
          label: { show: false },
        })),
      }
    : undefined;
  const valueLabels = sideways && oneValuePerCategory(chart);
  return {
    animation: !reducedMotion,
    animationDuration: reducedMotion ? 0 : MOTION_MS,
    animationDurationUpdate: reducedMotion ? 0 : MOTION_MS,
    textStyle: text(theme),
    grid: {
      left: 8,
      right: valueLabels ? 56 : 24,
      top: 12,
      bottom: chart.value_label ? 40 : 16,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: theme.surface,
      borderColor: theme.line,
      textStyle: text(theme),
      valueFormatter: (value: number | null) => formatValue(value, chart.unit),
    },
    xAxis: sideways ? valueAxis : categoryAxis,
    yAxis: sideways ? categoryAxis : valueAxis,
    series: chart.series.map((series, index) => ({
      name: series.label,
      type: chart.kind,
      data: series.values,
      stack: chart.stacked ? "all" : undefined,
      barMaxWidth: 22,
      itemStyle: { color: theme.roles[series.role], borderRadius: 2 },
      lineStyle: { color: theme.roles[series.role], width: 2 },
      connectNulls: false,
      label: valueLabels
        ? {
            show: true,
            position: "right",
            ...text(theme),
            formatter: (item: { value: number | null }) =>
              formatValue(item.value, chart.unit),
          }
        : { show: false },
      markLine: index === 0 ? markLine : undefined,
    })),
  };
}
