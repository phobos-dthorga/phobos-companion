import { samePage, samePlace, type Dialog, type Place } from "./place";

/** The places the owner has been, and which one they are at: Back and Forward walk it, as a browser's history does. */
export type Trail = { places: Place[]; at: number };

/** The most places kept; the oldest go first. */
export const TRAIL_LIMIT = 100;

export function here(trail: Trail): Place {
  return trail.places[trail.at];
}

/** Goes somewhere new: anything Forward would have reached is dropped, as in a browser. Going where you are changes nothing. */
export function go(trail: Trail, next: Place): Trail {
  if (samePlace(here(trail), next)) return trail;
  const places = [...trail.places.slice(0, trail.at + 1), next].slice(
    -TRAIL_LIMIT,
  );
  return { places, at: places.length - 1 };
}

/** Changes where you are without a new step: a choice made on a page (which changelog, which method) is part of the place. */
export function amend(trail: Trail, change: Partial<Place>): Trail {
  const places = trail.places.map((p, index) =>
    index === trail.at ? { ...p, ...change } : p,
  );
  return { places, at: trail.at };
}

/**
 * Goes to a place by a link: one with a dialog on another page arrives in two steps, the page and then the dialog, so Back closes
 * the dialog and leaves you on its page.
 */
export function arrive(trail: Trail, next: Place): Trail {
  if (next.dialog && !samePage(here(trail), next))
    return go(go(trail, { ...next, dialog: null }), next);
  return go(trail, next);
}

export function back(trail: Trail): Trail {
  return trail.at > 0 ? { ...trail, at: trail.at - 1 } : trail;
}

export function forward(trail: Trail): Trail {
  return trail.at < trail.places.length - 1
    ? { ...trail, at: trail.at + 1 }
    : trail;
}

export function openDialog(trail: Trail, dialog: Dialog): Trail {
  return go(trail, { ...here(trail), dialog });
}

/**
 * Closes the dialog where you are. When the step before is the same page (the dialog was opened from it, or from another dialog
 * over it), closing is Back, so Forward opens it again; otherwise the dialog just goes.
 */
export function closeDialog(trail: Trail): Trail {
  const now = here(trail);
  if (!now.dialog) return trail;
  const before = trail.places[trail.at - 1];
  if (before && samePage(before, now)) return back(trail);
  return amend(trail, { dialog: null });
}
