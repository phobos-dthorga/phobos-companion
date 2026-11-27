/**
 * Filtering a long list on a page (0.110.0; the owner's choice of 27 Nov 2026, "Both, one key each": Ctrl + F filters the page's
 * list, / searches everything). One rule everywhere: every word typed appears somewhere in the thing's words, ignoring case.
 */
export function matchesFilter(
  words: (string | null | undefined)[],
  filter: string,
): boolean {
  const wanted = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (wanted.length === 0) return true;
  const all = words.filter(Boolean).join(" ").toLowerCase();
  return wanted.every((w) => all.includes(w));
}

/** Ctrl + F: the first filter box shown on the page, given the keyboard; false when the page has none. */
export function focusPageFilter(root: ParentNode = document): boolean {
  const boxes = root.querySelectorAll<HTMLInputElement>(
    ".canvas [data-page-filter]",
  );
  for (const box of boxes) {
    if (box.offsetParent !== null || box.getClientRects().length > 0) {
      box.focus();
      box.select();
      return true;
    }
  }
  return false;
}
