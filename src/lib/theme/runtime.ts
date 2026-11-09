export type ThemeColours = Record<string, string>;

/** Each role becomes a CSS variable, so components name a role and never a colour. */
export function applyTheme(colours: ThemeColours): void {
  const style = document.documentElement.style;
  for (const [role, value] of Object.entries(colours)) {
    style.setProperty(`--colour-${role.replaceAll("_", "-")}`, value);
  }
}
