import type { Report } from "../reports/types";
import type { Waiting } from "../shell/types";

/** What the host answers: word when the game's tools cannot read its saves. */
export type SaveReading = {
  available: boolean;
  report: Report | null;
  data: Record<string, unknown> | null;
  command_line: string;
};

export type Reading = Waiting | { state: "ready"; reading: SaveReading };

/** What the page asks of a save: a level of its parts, a search, or one thing in full. */
export type AskKind = "parts" | "search" | "thing";

/** One part of a save, as `schema` lists it (phobos-modkit 1.155.0): its element path and how many there are. */
export type Part = { path: string; count: number };
