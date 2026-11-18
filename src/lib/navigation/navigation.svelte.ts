import {
  addressOf,
  place,
  type Dialog,
  type PageName,
  type Place,
} from "./place";
import * as trails from "./trail";

/**
 * The window's one trail of places (docs/cross-links.md, N1): every page change, game change, choice on a page and dialog over it
 * goes through here, so Back and Forward always know where the owner has been.
 */
export const nav = $state<{ trail: trails.Trail }>({
  trail: { places: [place("home")], at: 0 },
});

export function here(): Place {
  return trails.here(nav.trail);
}

/** Goes to a place: a dialog on another page arrives after its page, so Back closes it first. */
export function go(next: Place) {
  nav.trail = trails.arrive(nav.trail, next);
}

/** The game shown, once the list of games is read, for the place where you are when it named none. */
export function settleGame(game: string) {
  if (here().game === null) nav.trail = trails.amend(nav.trail, { game });
}

/** Another page, for the game shown now. */
export function goPage(page: PageName, focus: Record<string, string> = {}) {
  go({ page, game: here().game, focus, dialog: null });
}

/** Another game, keeping the page. */
export function goGame(game: string) {
  go({ page: here().page, game, focus: {}, dialog: null });
}

/** A choice made on the page where you are: it becomes part of the place, without a new step. */
export function setFocus(focus: Record<string, string>) {
  nav.trail = trails.amend(nav.trail, { focus: { ...here().focus, ...focus } });
}

export function openDialog(dialog: Dialog) {
  nav.trail = trails.openDialog(nav.trail, dialog);
}

export function closeDialog() {
  nav.trail = trails.closeDialog(nav.trail);
}

export function back() {
  nav.trail = trails.back(nav.trail);
}

export function forward() {
  nav.trail = trails.forward(nav.trail);
}

export function canGoBack(): boolean {
  return nav.trail.at > 0;
}

export function canGoForward(): boolean {
  return nav.trail.at < nav.trail.places.length - 1;
}

/** Puts a place's address on the clipboard; false when the clipboard refused it. */
export async function copyAddress(where: Place = here()): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(addressOf(where));
    return true;
  } catch {
    return false;
  }
}
