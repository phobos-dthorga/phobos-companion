import { tick } from "svelte";

/** How long a place a link led to stays outlined. */
const OUTLINED_MS = 2400;

/**
 * Brings the element a link points at into view, gives it the keyboard and outlines it for a moment, so the eye finds where the
 * link led (docs/cross-links.md, N1). False when nothing on the page has that id.
 */
export async function reveal(id: string): Promise<boolean> {
  await tick();
  const element = document.getElementById(id);
  if (!element) return false;
  element.scrollIntoView({ block: "center" });
  if (!element.hasAttribute("tabindex") && element.tabIndex < 0)
    element.setAttribute("tabindex", "-1");
  element.focus({ preventScroll: true });
  element.classList.add("revealed");
  window.setTimeout(() => element.classList.remove("revealed"), OUTLINED_MS);
  return true;
}
