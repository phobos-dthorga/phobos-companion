import { ALL_ROLES, validColour, withCodeColours } from "./presentation";

export type ThemeColours = Record<string, string>;

/**
 * Each role becomes a CSS variable, so components name a role and never a colour. Only the theme roles are set, and only as
 * `#RRGGBB`: a theme is data and can never write anything else into the page (0.33.0, after OnAir's data-only themes). The code
 * colours (0.76.0) become `--colour-code-<role>`, taken from the other roles for a theme kept before they existed.
 */
export function applyTheme(
  colours: ThemeColours,
  target: HTMLElement = document.documentElement,
): void {
  const given = withCodeColours(colours);
  for (const role of ALL_ROLES) {
    const value = given[role];
    if (typeof value === "string" && validColour(value))
      target.style.setProperty(`--colour-${role.replaceAll("_", "-")}`, value);
  }
}

/** The theme in use, kept in the window's own storage so the next start draws in it at once, before the host answers. */
const KEPT = "companion.theme";

export function rememberTheme(colours: ThemeColours): void {
  try {
    localStorage.setItem(KEPT, JSON.stringify(colours));
  } catch {
    // Storage full or refused: the next start draws House D'thorga until the host answers, as before.
  }
}

export function rememberedTheme(): ThemeColours | null {
  try {
    const text = localStorage.getItem(KEPT);
    const value = text ? (JSON.parse(text) as unknown) : null;
    return value && typeof value === "object" ? (value as ThemeColours) : null;
  } catch {
    return null;
  }
}

/** Uses a theme: drawn now, and kept for the next start. */
export function useTheme(colours: ThemeColours): void {
  applyTheme(colours);
  rememberTheme(colours);
}
