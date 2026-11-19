/**
 * Screen notes, "something's off" (0.22.0; docs/later.md, item 1): what the window sends with a note's picture, and what Home
 * reads back. The host writes each note into its own folder; agent sessions read them with the kit's `screen-notes list`.
 */

/** What the window knows of the page when the note is taken; the host adds the time and the program's version. */
export interface NoteRequest {
  /** The owner's local time, 20261119-101500: the note's name. */
  stamp: string;
  game: string;
  page: string;
  address: string;
  words: string;
  width: number;
  height: number;
}

export interface Note {
  id: string;
  /** When, in UTC (ISO). */
  time: string;
  game: string;
  page: string;
  address: string;
  words: string;
  has_picture: boolean;
  resolved: { time: string; how: string } | null;
}

export interface Notes {
  open: Note[];
  /** The newest few dealt with. */
  dealt: Note[];
  dealt_count: number;
}

/** A note's name from the owner's own clock: 20261119-101500, so notes sort by when they were taken. */
export function noteStamp(when: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return (
    `${when.getFullYear()}${two(when.getMonth() + 1)}${two(when.getDate())}-` +
    `${two(when.getHours())}${two(when.getMinutes())}${two(when.getSeconds())}`
  );
}
