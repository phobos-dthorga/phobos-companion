/** The three ways to look a definition up (0.106.0), in the tab's order: the host runs only these. */
export const LOOK_KINDS = ["who", "show", "patched"] as const;
export type LookKind = (typeof LOOK_KINDS)[number];

/** A look the place names, else the first. */
export function lookKind(text: string | undefined): LookKind {
  return (LOOK_KINDS as readonly string[]).includes(text ?? "")
    ? (text as LookKind)
    : "who";
}

/** A definition's name as games write them, with * and ? for a search: the window's check, which the host makes again. */
export function definitionName(text: string): boolean {
  const name = text.trim();
  return (
    name.length > 0 &&
    name.length <= 120 &&
    !name.startsWith("-") &&
    /^[A-Za-z0-9_.\-*?]+$/.test(name) &&
    /[A-Za-z0-9]/.test(name)
  );
}
