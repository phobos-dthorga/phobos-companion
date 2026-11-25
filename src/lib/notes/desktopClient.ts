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

/** The person's home folder, hidden in a report's picture (0.100.0); null when it can't be known. */
export async function readHome(): Promise<string | null> {
  const answer = await ask<
    string | null,
    { state: "ready"; home: string | null } | Failed
  >("report_home", {}, (home) => ({ state: "ready", home }));
  return answer.state === "ready" ? answer.home : null;
}

/** The GitHub issue a report would open, built by the host from these words (0.100.0). Nothing leaves. */
export async function previewReport(
  words: string,
  page: string,
): Promise<
  { state: "ready"; report: { title: string; body: string } } | Failed
> {
  return ask<
    { title: string; body: string },
    { state: "ready"; report: { title: string; body: string } } | Failed
  >("report_preview", { words, page }, (report) => ({
    state: "ready",
    report,
  }));
}

/** Saves the picture in the Pictures folder and opens GitHub's new-issue page, filled in (0.100.0). Returns the picture's name. */
export async function openReport(
  picture: Uint8Array,
  words: string,
  page: string,
): Promise<{ state: "ready"; picture: string } | Failed> {
  return ask<string, { state: "ready"; picture: string } | Failed>(
    "report_open",
    picture,
    (saved) => ({ state: "ready", picture: saved }),
    {
      headers: {
        "x-report-words": encodeURIComponent(words),
        "x-report-page": encodeURIComponent(page),
      },
    },
  );
}
