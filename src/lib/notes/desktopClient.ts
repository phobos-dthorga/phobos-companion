import { ask } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { NoteRequest, Notes } from "./notes";

/** Saves a screen note: the page's picture as the body, what the window knows of the page in a header. The note's name. */
export async function saveScreenNote(
  bytes: Uint8Array,
  note: NoteRequest,
): Promise<{ state: "ready"; id: string } | Failed> {
  return ask<string, { state: "ready"; id: string }>(
    "save_screen_note",
    bytes,
    (id) => ({ state: "ready", id }),
    { headers: { "x-screen-note": encodeURIComponent(JSON.stringify(note)) } },
  );
}

/** The screen notes: open ones newest first, and the newest dealt with. */
export async function readScreenNotes(): Promise<
  { state: "ready"; notes: Notes } | Failed
> {
  return ask<Notes, { state: "ready"; notes: Notes }>(
    "screen_notes_list",
    {},
    (notes) => ({ state: "ready", notes }),
  );
}

/** Shows a note's picture in the file manager. */
export async function showScreenNote(
  id: string,
): Promise<{ state: "ready" } | Failed> {
  return ask<null, { state: "ready" }>("show_screen_note", { id }, () => ({
    state: "ready",
  }));
}
