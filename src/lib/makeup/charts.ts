import type { EChartsCoreOption } from "echarts/core";
import { CHART_FONT_PX } from "../charts/chartOptions";
import {
  KINDS,
  TEST_STATES,
  type Mix,
  type TestState,
  type TreeNode,
} from "./presentation";
import type { Kind } from "./types";

/** The colours and font a picture uses, read from the theme. */
export type Palette = {
  kinds: Record<Kind, string>;
  states: Record<TestState, string>;
  /** The heat ramp, coolest first: one hue, darkest near the surface (dark theme). */
  heat: string[];
  text: string;
  muted: string;
  line: string;
  surface: string;
  font: string;
};

/** One hue from near the surface to bright, for how often something changed (the reference blue ramp, dark steps). */
export const HEAT_RAMP = [
  "#104281",
  "#184f95",
  "#256abf",
  "#3987e5",
  "#6da7ec",
  "#9ec5f4",
];

export type Words = {
  kind: (kind: Kind) => string;
  state: (state: TestState) => string;
  amount: (value: number) => string;
  changes: (count: number) => string;
  /** The whole picture's name, the first step of the path under it. */
  everything: string;
};

const GAP_PX = 2;
const BAR_PX = 18;
const ROW_PX = 30;
const FRAME_PX = 90;

function text(palette: Palette) {
  return {
    color: palette.text,
    fontFamily: palette.font,
    fontSize: CHART_FONT_PX,
  };
}

function tooltip(palette: Palette, trigger: "item" | "axis") {
  return {
    trigger,
    confine: true,
    backgroundColor: palette.surface,
    borderColor: palette.line,
    textStyle: text(palette),
    ...(trigger === "axis"
      ? { axisPointer: { type: "line", lineStyle: { color: palette.muted } } }
      : {}),
  };
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** How tall a chart of rows needs to be. */
export function rowsHeight(rows: number): number {
  return FRAME_PX + Math.max(rows, 2) * ROW_PX;
}

type Heat = (node: TreeNode) => number;

/** Each node's heat (the changes under it), then a colour from the ramp by its share of the busiest node at its depth. */
function heatColours(
  roots: TreeNode[],
  heat: Heat,
  ramp: string[],
): Map<TreeNode, string> {
  const sums = new Map<TreeNode, number>();
  const sum = (node: TreeNode): number => {
    const value = node.children
      ? node.children.reduce((a, c) => a + sum(c), 0)
      : heat(node);
    sums.set(node, value);
    return value;
  };
  roots.forEach(sum);
  const maxima: number[] = [];
  const walk = (node: TreeNode, depth: number) => {
    maxima[depth] = Math.max(maxima[depth] ?? 0, sums.get(node) ?? 0);
    node.children?.forEach((c) => walk(c, depth + 1));
  };
  roots.forEach((r) => walk(r, 0));
  const colours = new Map<TreeNode, string>();
  const paint = (node: TreeNode, depth: number) => {
    const max = maxima[depth] || 1;
    const share = (sums.get(node) ?? 0) / max;
    colours.set(
      node,
      share <= 0
        ? ramp[0]
        : ramp[
            Math.min(ramp.length - 1, 1 + Math.floor(share * (ramp.length - 1)))
          ],
    );
    node.children?.forEach((c) => paint(c, depth + 1));
  };
  roots.forEach((r) => paint(r, 0));
  return colours;
}

/** What it's made of, as a treemap: owners, then folders, then files; coloured by kind, or by how often each changed. */
export function treemapOptions(
  roots: TreeNode[],
  palette: Palette,
  words: Words,
  heat: Heat | null,
  reducedMotion: boolean,
): EChartsCoreOption {
  const colours = heat ? heatColours(roots, heat, palette.heat) : null;
  const data = (node: TreeNode): object => ({
    name: node.name,
    value: node.value,
    kind: node.kind,
    itemStyle: {
      color: colours ? colours.get(node) : palette.kinds[node.kind],
    },
    ...(node.children ? { children: node.children.map(data) } : {}),
  });
  return {
    animation: !reducedMotion,
    textStyle: text(palette),
    tooltip: {
      ...tooltip(palette, "item"),
      formatter: (info: {
        name: string;
        value: number;
        data: { kind: Kind };
        treePathInfo: { name: string }[];
      }) => {
        const path = info.treePathInfo
          .map((p) => p.name)
          .filter(Boolean)
          .join(" / ");
        return `${escape(path)}<br>${escape(words.amount(info.value))} · ${escape(words.kind(info.data.kind))}`;
      },
    },
    series: [
      {
        type: "treemap",
        name: words.everything,
        data: roots.map(data),
        roam: false,
        leafDepth: 2,
        nodeClick: "zoomToNode",
        visibleMin: 64,
        top: 8,
        left: 0,
        right: 0,
        bottom: 36,
        breadcrumb: {
          bottom: 4,
          itemStyle: {
            color: palette.surface,
            borderColor: palette.line,
            textStyle: text(palette),
          },
          emphasis: { itemStyle: { color: palette.line } },
        },
        label: {
          ...text(palette),
          color: "#ffffff",
          textBorderColor: "#000000",
          textBorderWidth: 2,
          overflow: "truncate",
        },
        upperLabel: {
          show: true,
          height: 22,
          ...text(palette),
          color: palette.text,
          overflow: "truncate",
        },
        itemStyle: {
          borderColor: palette.surface,
          borderWidth: GAP_PX,
          gapWidth: GAP_PX,
        },
        // The first level is the whole picture, which draws nothing of its own: no band, no border.
        levels: [
          {
            upperLabel: { show: false },
            itemStyle: { borderWidth: 0, gapWidth: GAP_PX * 2 },
          },
          {
            itemStyle: {
              borderColor: palette.line,
              borderWidth: GAP_PX,
              gapWidth: GAP_PX,
            },
          },
          { itemStyle: { borderColor: palette.surface, gapWidth: GAP_PX } },
        ],
      },
    ],
  };
}

/** Each owner's mix of kinds, as stacked bars running sideways, biggest owner at the top. */
export function mixOptions(
  mix: Mix,
  kinds: Kind[],
  palette: Palette,
  words: Words,
  reducedMotion: boolean,
): EChartsCoreOption {
  const owners = [...mix.owners].reverse();
  return {
    animation: !reducedMotion,
    textStyle: text(palette),
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...tooltip(palette, "item"),
      formatter: (info: { name: string; seriesName: string; value: number }) =>
        `${escape(info.name)}<br>${escape(info.seriesName)}: ${escape(words.amount(info.value))}`,
    },
    xAxis: {
      type: "value",
      axisLabel: {
        ...text(palette),
        color: palette.muted,
        formatter: (v: number) => words.amount(v),
      },
      splitLine: { lineStyle: { color: palette.line, opacity: 0.5 } },
    },
    yAxis: {
      type: "category",
      data: owners,
      axisLabel: { ...text(palette), width: 200, overflow: "truncate" },
      axisLine: { lineStyle: { color: palette.line } },
      axisTick: { show: false },
    },
    series: kinds.map((kind) => ({
      type: "bar",
      name: words.kind(kind),
      stack: "kinds",
      barWidth: BAR_PX,
      data: owners.map((o) => mix.totals.get(o)?.get(kind) ?? 0),
      itemStyle: {
        color: palette.kinds[kind],
        borderColor: palette.surface,
        borderWidth: GAP_PX / 2,
        borderRadius: 2,
      },
    })),
  };
}

/** How it grew: one stacked area a kind, day by day. */
export function growthOptions(
  days: string[],
  series: { kind: Kind; values: number[] }[],
  palette: Palette,
  words: Words,
  reducedMotion: boolean,
): EChartsCoreOption {
  return {
    animation: !reducedMotion,
    textStyle: text(palette),
    grid: { left: 8, right: 16, top: 12, bottom: 8, containLabel: true },
    tooltip: {
      ...tooltip(palette, "axis"),
      valueFormatter: (v: number) => words.amount(v),
    },
    xAxis: {
      type: "category",
      data: days,
      boundaryGap: false,
      axisLabel: { ...text(palette), color: palette.muted },
      axisLine: { lineStyle: { color: palette.line } },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        ...text(palette),
        color: palette.muted,
        formatter: (v: number) => words.amount(v),
      },
      splitLine: { lineStyle: { color: palette.line, opacity: 0.5 } },
    },
    series: series.map(({ kind, values }) => ({
      type: "line",
      name: words.kind(kind),
      stack: "kinds",
      data: values,
      symbol: "none",
      lineStyle: { width: 2, color: palette.kinds[kind] },
      itemStyle: { color: palette.kinds[kind] },
      areaStyle: { color: palette.kinds[kind], opacity: 0.55 },
    })),
  };
}

/** How much of each product is tested in game, as stacked bars by state. */
export function testedOptions(
  products: string[],
  counts: Map<string, Record<TestState, number>>,
  palette: Palette,
  words: Words,
  reducedMotion: boolean,
): EChartsCoreOption {
  const rows = [...products].reverse();
  return {
    animation: !reducedMotion,
    textStyle: text(palette),
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...tooltip(palette, "item"),
      formatter: (info: { name: string; seriesName: string; value: number }) =>
        `${escape(info.name)}<br>${escape(info.seriesName)}: ${info.value}`,
    },
    xAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { ...text(palette), color: palette.muted },
      splitLine: { lineStyle: { color: palette.line, opacity: 0.5 } },
    },
    yAxis: {
      type: "category",
      data: rows,
      axisLabel: { ...text(palette), width: 200, overflow: "truncate" },
      axisLine: { lineStyle: { color: palette.line } },
      axisTick: { show: false },
    },
    series: TEST_STATES.map((state) => ({
      type: "bar",
      name: words.state(state),
      stack: "states",
      barWidth: BAR_PX,
      data: rows.map((p) => counts.get(p)?.[state] ?? 0),
      itemStyle: {
        color: palette.states[state],
        borderColor: palette.surface,
        borderWidth: GAP_PX / 2,
        borderRadius: 2,
      },
    })),
  };
}

/** Every kind's colour from the theme, in the fixed order. */
export function kindColours(
  colour: (role: string) => string,
): Record<Kind, string> {
  return Object.fromEntries(
    KINDS.map((kind, i) => [kind, colour(`series-${i + 1}`)]),
  ) as Record<Kind, string>;
}
