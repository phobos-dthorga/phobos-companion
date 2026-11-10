import type { ChartRole } from "../reports/types";
import type { ChartTheme } from "./chartOptions";

const ROLES: ChartRole[] = [
  "accent",
  "observed",
  "comparison",
  "risk",
  "success",
  "neutral",
];

/** The theme's colours from the page's CSS variables (lib/theme/runtime.ts sets them), so a chart follows the theme. */
export function readChartTheme(
  element: HTMLElement = document.documentElement,
): ChartTheme {
  const style = getComputedStyle(element);
  const colour = (name: string) =>
    style.getPropertyValue(`--colour-${name}`).trim();
  const roles = Object.fromEntries(
    ROLES.map((role) => [
      role,
      colour(role === "neutral" ? "text-muted" : role),
    ]),
  ) as Record<ChartRole, string>;
  return {
    roles,
    text: colour("text"),
    muted: colour("text-muted"),
    line: colour("line"),
    surface: colour("surface-raised"),
    font: getComputedStyle(document.body).fontFamily,
  };
}
