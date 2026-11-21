import { themeColour } from "./decode";
import { rgbOf } from "./pixels";

/** How a changed picture is shown (0.50.0). */
export type PictureView = "side" | "flick" | "changed";

export const VIEWS: { id: PictureView; words: string }[] = [
  { id: "side", words: "media-view-side" },
  { id: "flick", words: "media-view-flick" },
  { id: "changed", words: "media-view-changed" },
];

/** Fitted to the pane, or the picture's own pixels made larger: preset steps, never a slider. */
export type Zoom = "fit" | 1 | 2 | 4 | 8;
export const ZOOMS: Zoom[] = ["fit", 1, 2, 4, 8];

/** What shows through a picture's see-through parts: stray specks hide on the wrong ground. */
export type Backdrop = "checks" | "dark" | "light";

export const BACKDROPS: { id: Backdrop; words: string }[] = [
  { id: "checks", words: "media-backdrop-checks" },
  { id: "dark", words: "media-backdrop-dark" },
  { id: "light", words: "media-backdrop-light" },
];

function lightness(hex: string): number {
  const [r, g, b] = rgbOf(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The theme's darkest and lightest plain colours (its canvas and its words, whichever way round a theme has them). */
export function darkAndLight(
  canvas: string,
  text: string,
): { dark: string; light: string } {
  return lightness(canvas) <= lightness(text)
    ? { dark: canvas, light: text }
    : { dark: text, light: canvas };
}

/** The style a picture's frame takes for a backdrop, from the theme in use: never a colour of its own. */
export function backdropStyle(backdrop: Backdrop): string {
  const { dark, light } = darkAndLight(
    themeColour("canvas"),
    themeColour("text"),
  );
  if (backdrop === "dark") return `background: ${dark};`;
  if (backdrop === "light") return `background: ${light};`;
  return `background-color: ${dark}; background-image: conic-gradient(${light}33 25%, transparent 0 50%, ${light}33 0 75%, transparent 0); background-size: 16px 16px;`;
}
