import {
  TOLERANCES,
  VIEWS,
  ZOOMS,
  type PictureView,
  type Zoom,
} from "./viewing";

/** How pictures are being looked at in one place: what the window keeps between runs (0.58.0). */
export type ViewSettings = {
  view: PictureView;
  zoom: Zoom;
  /** One of the Companion's grounds, or a game's own by its place in a picks file's grounds ("ground-0"). */
  backdrop: string;
  tolerance: number;
  flicked: "before" | "after";
  /** Loose specks, strokes, fringes and haze marked (0.57.0). */
  edges: boolean;
};

/** The key in the window's own storage. */
export const KEPT_KEY = "companion.viewSettings";
/** At most this many places are kept, so a stored list can never grow without end. */
const MOST_PLACES = 20;
const PLACE = /^[a-z0-9-]{1,40}$/;
const BACKDROP = /^(checks|dark|light|ground-[0-5])$/;

/** One place's settings from what was stored, or null when any value is not one this version offers. */
export function checked(value: unknown): ViewSettings | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!VIEWS.some((choice) => choice.id === v.view)) return null;
  if (!ZOOMS.includes(v.zoom as Zoom)) return null;
  if (typeof v.backdrop !== "string" || !BACKDROP.test(v.backdrop)) return null;
  if (!(TOLERANCES as readonly number[]).includes(v.tolerance as number))
    return null;
  if (v.flicked !== "before" && v.flicked !== "after") return null;
  if (typeof v.edges !== "boolean") return null;
  return {
    view: v.view as PictureView,
    zoom: v.zoom as Zoom,
    backdrop: v.backdrop,
    tolerance: v.tolerance as number,
    flicked: v.flicked,
    edges: v.edges,
  };
}

/** Every place's settings from stored text: places whose values fail a check are left out, so they start afresh. */
export function fromText(text: string | null): Record<string, ViewSettings> {
  if (!text) return {};
  let stored: unknown;
  try {
    stored = JSON.parse(text);
  } catch {
    return {};
  }
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
  const found: Record<string, ViewSettings> = {};
  for (const [place, value] of Object.entries(stored).slice(0, MOST_PLACES)) {
    const settings = PLACE.test(place) ? checked(value) : null;
    if (settings) found[place] = settings;
  }
  return found;
}

/** What the window kept last run; nothing when its storage is empty or refused. */
export function readKept(): Record<string, ViewSettings> {
  try {
    return fromText(localStorage.getItem(KEPT_KEY));
  } catch {
    return {};
  }
}

export function writeKept(text: string) {
  try {
    localStorage.setItem(KEPT_KEY, text);
  } catch {
    // Storage refused (a private window, a full disk): the settings last for this run only.
  }
}
