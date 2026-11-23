import table from "../code/scopeRoles.json";
import { contrast, mix } from "./contrast";
import type { Problem, Theme } from "./types";

/**
 * The theme roles and the checks a theme must pass, as the host's `companion_core::themes` holds them (0.33.0). The window checks
 * a theme being made as it changes, so its maker sees each failing pair at once; the host checks again before it is kept.
 */
export const ROLES = [
  "canvas",
  "surface",
  "surface_raised",
  "surface_soft",
  "text",
  "text_muted",
  "line",
  "accent",
  "observed",
  "risk",
  "success",
  "comparison",
  "series_1",
  "series_2",
  "series_3",
  "series_4",
  "series_5",
  "series_6",
  "series_7",
  "series_8",
] as const;

export type Role = (typeof ROLES)[number];

export const SURFACES: Role[] = [
  "canvas",
  "surface",
  "surface_raised",
  "surface_soft",
];
export const READABLE: Role[] = [
  "text",
  "text_muted",
  "accent",
  "observed",
  "risk",
  "success",
  "comparison",
];
export const SERIES: Role[] = ROLES.filter((r) => r.startsWith("series_"));
export const TEXT_MIN = 4.5;
export const GRAPHIC_MIN = 3;
export const LINE_MIN = 1.5;
export const BUILT_IN_PREFIX = "org.phobosdthorga.companion.";
/**
 * Removed and added lines' backgrounds: their role, this share of it over the background (0.41.1; the owner, 21 Nov 2026: removed
 * code had "not nearly high enough" contrast). `app.css` mixes the same share; words must read on both, as on any surface.
 */
export const DIFF_SHARE = 0.2;
export const DIFF_TINTS: [string, Role][] = [
  ["diff_removed", "risk"],
  ["diff_added", "success"],
];
/**
 * Shades (0.47.0; the owner, 22 Nov 2026: "extra colours/shades ... as appropriate to each theme"): a role, this share of it over
 * the raised surface the page's panels use. `app.css` mixes the same share as `--shade-<role>`; words must read on each.
 */
export const SHADE_SHARE = 0.14;
export const SHADE_TINTS: [string, Role][] = [
  ["shade_accent", "accent"],
  ["shade_observed", "observed"],
  ["shade_comparison", "comparison"],
  ["shade_success", "success"],
  ["shade_risk", "risk"],
];
const MIXED: [number, Role, [string, Role][]][] = [
  [DIFF_SHARE, "canvas", DIFF_TINTS],
  [SHADE_SHARE, "surface_raised", SHADE_TINTS],
];

/**
 * The code colours (0.76.0; docs/code-reading.md, step 1), in `scopeRoles.json`'s order, as the host's `CODE_ROLES` lists them. A
 * theme gives all twelve or none; with none, each takes the role in `CODE_FROM`, as code was coloured before.
 */
export const CODE_ROLES: string[] = table.roles.map((role) => `code_${role}`);
export const CODE_FROM: Record<string, Role> = {
  code_keyword: "comparison",
  code_flow: "comparison",
  code_type: "observed",
  code_function: "observed",
  code_variable: "text",
  code_constant: "accent",
  code_string: "success",
  code_number: "accent",
  code_comment: "text_muted",
  code_tag: "observed",
  code_punctuation: "text",
  code_plain: "text",
};
/** Every colour a theme file lists, in its order: the roles, then the code colours. */
export const ALL_ROLES: string[] = [...ROLES, ...CODE_ROLES];
/** What code is drawn on: the background, and removed and added lines. */
export const CODE_GROUNDS = ["canvas", "diff_removed", "diff_added"];

/** A theme's colours with its code colours, taken from its other roles when it has none. */
export function withCodeColours(
  colours: Record<string, string>,
): Record<string, string> {
  if (CODE_ROLES.some((role) => role in colours)) return colours;
  return {
    ...colours,
    ...Object.fromEntries(
      CODE_ROLES.map((role) => [role, colours[CODE_FROM[role]]]),
    ),
  };
}

export function validColour(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

/** Every pair that fails, as the host finds them: words at 4.5:1, chart colours at 3:1, lines at 1.5:1, on every surface. */
export function problems(colours: Record<string, string>): Problem[] {
  const found: Problem[] = [];
  for (const on of SURFACES) {
    const checks: [Role, number][] = [
      ...READABLE.map((r) => [r, TEXT_MIN] as [Role, number]),
      ...SERIES.map((r) => [r, GRAPHIC_MIN] as [Role, number]),
      ["line", LINE_MIN],
    ];
    for (const [role, needs] of checks) {
      if (!validColour(colours[role] ?? "") || !validColour(colours[on] ?? ""))
        continue;
      const ratio = contrast(colours[role], colours[on]);
      if (ratio < needs)
        found.push({ role, on, ratio: Math.round(ratio * 100) / 100, needs });
    }
  }
  for (const [share, base, tints] of MIXED) {
    for (const [on, tint] of tints) {
      if (
        !validColour(colours[tint] ?? "") ||
        !validColour(colours[base] ?? "")
      )
        continue;
      const background = mix(colours[tint], colours[base], share);
      for (const role of READABLE) {
        if (!validColour(colours[role] ?? "")) continue;
        const ratio = contrast(colours[role], background);
        if (ratio < TEXT_MIN)
          found.push({
            role,
            on,
            ratio: Math.round(ratio * 100) / 100,
            needs: TEXT_MIN,
          });
      }
    }
  }
  if (!validColour(colours.canvas ?? "")) return found;
  for (const on of CODE_GROUNDS) {
    const tint = DIFF_TINTS.find(([name]) => name === on)?.[1];
    if (tint && !validColour(colours[tint] ?? "")) continue;
    const ground = tint
      ? mix(colours[tint], colours.canvas, DIFF_SHARE)
      : colours.canvas;
    for (const role of CODE_ROLES) {
      if (!validColour(colours[role] ?? "")) continue;
      const ratio = contrast(colours[role], ground);
      if (ratio < TEXT_MIN)
        found.push({
          role,
          on,
          ratio: Math.round(ratio * 100) / 100,
          needs: TEXT_MIN,
        });
    }
  }
  return found;
}

/** A short id for a theme the owner makes, from its name: never the program's own prefix. */
export function idFor(name: string): string {
  const id = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return id.length >= 3 ? id : `${id || "my"}-theme`;
}

/** The theme as a file, as the host writes one: its roles in order, then its code colours. */
export function themeFile(theme: Theme): string {
  const given = withCodeColours(theme.colours);
  const colours: Record<string, string> = {};
  for (const role of ALL_ROLES) colours[role] = given[role];
  const document: Record<string, unknown> = {
    schema_version: 1,
    id: theme.id,
    name: theme.name,
  };
  if (theme.author) document.author = theme.author;
  document.colours = colours;
  return `${JSON.stringify(document, null, 2)}\n`;
}

/** The choice of code colours that means "the theme's own" (0.77.0; the host's `code_colours::THEME_OWN`). */
export const THEME_OWN = "theme";

/**
 * What a VS Code theme says it is, as one word the catalogue can choose its words by: VS Code writes `dark`, `light`, `hc`,
 * `hcLight` or `hc-black` in a theme file, and the host lists installed ones as dark, light or high contrast.
 */
export function kindOf(
  kind: string | null | undefined,
): "dark" | "light" | "high" {
  const word = (kind ?? "").toLowerCase();
  if (word.startsWith("hc") || word.includes("high")) return "high";
  return word.includes("light") || word === "vs" ? "light" : "dark";
}

/** The colours a theme's card shows as small swatches: its accent and its four meanings. */
export const SWATCHES: Role[] = [
  "accent",
  "observed",
  "comparison",
  "success",
  "risk",
];
