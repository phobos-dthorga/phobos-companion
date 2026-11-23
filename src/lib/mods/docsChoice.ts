/**
 * How the Mods page shows a mod whose only changes are its docs (0.80.0, the owner's choice of 24 Nov 2026): "update" shows it as
 * any other change (the default, as before), "quiet" says so on its card and leaves it out of Before you play's install line. Kept
 * in the window's own storage, as the theme is; storage that is missing or refused means the default.
 */
export type DocsChoice = "update" | "quiet";

export const DOCS_CHOICES: DocsChoice[] = ["update", "quiet"];

/** Each choice's button words, written out so the catalogue check can find them. */
export const DOCS_CHOICE_WORDS: Record<DocsChoice, string> = {
  update: "mods-docs-choice-update",
  quiet: "mods-docs-choice-quiet",
};

const KEY = "companion.mods.docs-only";

export function keptDocsChoice(): DocsChoice {
  try {
    return localStorage.getItem(KEY) === "quiet" ? "quiet" : "update";
  } catch {
    return "update";
  }
}

export function keepDocsChoice(choice: DocsChoice): void {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // Storage full or refused: the choice lasts until the window closes.
  }
}
