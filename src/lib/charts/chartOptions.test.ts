import { describe, expect, it } from "vitest";
import houseDthorga from "../../../themes/house-dthorga.json";
import type { ChartBlockData } from "../reports/types";
import { contrast } from "../theme/contrast";
import {
  CHART_FONT_PX,
  chartHeight,
  chartOptions,
  chartTable,
  formatValue,
  type ChartTheme,
} from "./chartOptions";

const colours = houseDthorga.colours;
const theme: ChartTheme = {
  roles: {
    accent: colours.accent,
    observed: colours.observed,
    comparison: colours.comparison,
    risk: colours.risk,
    success: colours.success,
    neutral: colours.text_muted,
  },
  text: colours.text,
  muted: colours.text_muted,
  line: colours.line,
  surface: colours.surface_raised,
  font: "Segoe UI",
};
const labels = { category: "Name", value: "Value", kind: "Kind" };

function mood(): ChartBlockData {
  return {
    type: "chart",
    kind: "bar",
    title: "Mood against breaking point",
    description: "Each pawn's mood.",
    unit: "%",
    value_label: "Mood",
    stacked: true,
    categories: ["Sheena", "Rory", "Raptor"],
    series: [
      { label: "Extreme break risk", role: "risk", values: [0, null, null] },
      { label: "Major break risk", role: "accent", values: [null, 7.9, null] },
      { label: "Fine", role: "success", values: [null, null, 84.3] },
    ],
    lines: [{ label: "Minor break", value: 35, role: "comparison" }],
  };
}

type Axis = {
  type: string;
  inverse?: boolean;
  axisLabel: { fontSize: number };
};
type Series = {
  type: string;
  stack?: string;
  itemStyle: { color: string };
  markLine?: { data: Record<string, unknown>[] };
  label: {
    show: boolean;
    formatter?: (item: { value: number | null }) => string;
  };
};

describe("chart options", () => {
  it("runs bars sideways with the first category on top", () => {
    const options = chartOptions(mood(), theme, false);
    expect((options.yAxis as Axis).type).toBe("category");
    expect((options.yAxis as Axis).inverse).toBe(true);
    expect((options.xAxis as Axis).type).toBe("value");
  });

  it("colours each series by its role from the theme, never from the tool", () => {
    const series = chartOptions(mood(), theme, false).series as Series[];
    expect(series.map((s) => s.itemStyle.color)).toEqual([
      colours.risk,
      colours.accent,
      colours.success,
    ]);
    expect(series.every((s) => s.stack === "all")).toBe(true);
  });

  it("draws reference lines on the value axis, named in the page's key instead of on the chart", () => {
    const [first, second] = chartOptions(mood(), theme, false)
      .series as Series[];
    expect(first.markLine?.data).toEqual([
      expect.objectContaining({ xAxis: 35, label: { show: false } }),
    ]);
    expect(second.markLine).toBeUndefined();
  });

  it("writes each bar's value at its end, so reading one needs no pointer", () => {
    const [first] = chartOptions(mood(), theme, false).series as Series[];
    expect(first.label.show).toBe(true);
    expect(first.label.formatter?.({ value: 7.9 })).toBe("7.9%");
    const crowded: ChartBlockData = {
      ...mood(),
      series: [
        { label: "A", role: "risk", values: [1, 2, 3] },
        { label: "B", role: "success", values: [1, 2, 3] },
      ],
    };
    const series = chartOptions(crowded, theme, false).series as Series[];
    expect(series.every((s) => !s.label.show)).toBe(true);
  });

  it("stops moving for people who ask for less motion", () => {
    const still = chartOptions(mood(), theme, true);
    expect(still.animation).toBe(false);
    expect(still.animationDuration).toBe(0);
    expect(chartOptions(mood(), theme, false).animation).toBe(true);
  });

  it("keeps chart text at or above the window's floor", () => {
    const options = chartOptions(mood(), theme, false);
    expect(CHART_FONT_PX).toBeGreaterThanOrEqual(12);
    expect((options.yAxis as Axis).axisLabel.fontSize).toBe(CHART_FONT_PX);
    expect((options.xAxis as Axis).axisLabel.fontSize).toBe(CHART_FONT_PX);
  });

  it("runs a line chart along its categories", () => {
    const line = { ...mood(), kind: "line" as const, stacked: false };
    const options = chartOptions(line, theme, false);
    expect((options.xAxis as Axis).type).toBe("category");
    expect((options.xAxis as Axis).inverse).toBe(false);
    expect(chartHeight(line)).toBe(320);
  });

  it("grows with the bars it holds", () => {
    expect(chartHeight(mood())).toBe(3 * 28 + 96);
    expect(chartHeight({ ...mood(), categories: ["One"] })).toBe(160);
    const many = { ...mood(), categories: Array.from({ length: 40 }, String) };
    expect(chartHeight(many)).toBe(40 * 28 + 96);
  });

  it("every role is visible against the panel a chart sits on", () => {
    for (const colour of Object.values(theme.roles)) {
      expect(contrast(colour, colours.surface_raised)).toBeGreaterThanOrEqual(
        3,
      );
    }
  });
});

describe("the numbers under a chart", () => {
  it("gives one value per row, with its kind, when each category has one", () => {
    const table = chartTable(mood(), labels);
    expect(table.headers).toEqual(["Name", "Mood", "Kind"]);
    expect(table.rows).toEqual([
      ["Sheena", "0%", "Extreme break risk"],
      ["Rory", "7.9%", "Major break risk"],
      ["Raptor", "84.3%", "Fine"],
    ]);
    expect(table.values.map((row) => row[1])).toEqual([0, 7.9, 84.3]);
  });

  it("gives a column per series when categories hold several", () => {
    const chart: ChartBlockData = {
      ...mood(),
      unit: "ms",
      value_label: "",
      series: [
        { label: "Before", role: "comparison", values: [1, 2, 3] },
        { label: "After", role: "observed", values: [4, null, 1200] },
      ],
    };
    const table = chartTable(chart, labels);
    expect(table.headers).toEqual(["Name", "Before", "After"]);
    expect(table.rows[2]).toEqual(["Raptor", "3 ms", "1,200 ms"]);
    expect(table.values[1]).toEqual([null, 2, null]);
  });

  it("writes values as the report does", () => {
    expect(formatValue(null, "%")).toBe("");
    expect(formatValue(-5.25, "")).toBe("-5.3");
    expect(formatValue(120, "")).toBe("120");
  });
});
