import type { Failed } from "../shell/types";

/** How the updater stands (0.85.0, `docs/releases.md`), as the host says. */
export type UpdatesStatus =
  | { state: "off" }
  | { state: "not-set-up" }
  | { state: "elsewhere" }
  | { state: "waiting" }
  | { state: "checking" }
  | { state: "current"; checked: number }
  | { state: "fetching"; version: string; got: number; total: number | null }
  | {
      state: "ready";
      version: string;
      notes: string | null;
      date: string | null;
    }
  | { state: "failed"; reason: string };

export type UpdatesReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; status: UpdatesStatus }
  | Failed;
