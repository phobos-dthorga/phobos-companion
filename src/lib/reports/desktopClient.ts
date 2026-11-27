import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OtherAnswer } from "../othercode/types";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type { LookKind } from "./lookup";
import type {
  CatalogueReading,
  ReportEntry,
  ReportResult,
  RunReading,
} from "./types";

/** The reports the host offers for a game. */
export async function readCatalogue(game: string): Promise<CatalogueReading> {
  if (inBrowser()) return BROWSER;
  return ask<ReportEntry[], CatalogueReading>(
    "report_catalogue",
    { game },
    (entries) => ({ state: "ready", entries }),
  );
}

/** Asks the host to run one report. The host decides whether it may. */
export async function runReport(
  game: string,
  entry: ReportEntry,
  top: number,
  onProgress?: OnProgress,
): Promise<RunReading> {
  return ask<ReportResult, RunReading>(
    "run_report",
    {
      game,
      command: entry.command,
      report: entry.report,
      top,
      onProgress: progressChannel(onProgress),
    },
    (result) => ({ state: "ready", result }),
  );
}

/** One definition looked up by name (0.106.0): who defines and patches it, it as written, or it as patched. Only reads. */
export async function lookUp(
  game: string,
  kind: LookKind,
  name: string,
  onProgress?: OnProgress,
): Promise<{ state: "ready"; answer: OtherAnswer<unknown> } | Failed> {
  return ask<
    OtherAnswer<unknown>,
    { state: "ready"; answer: OtherAnswer<unknown> }
  >(
    "look_up",
    { game, kind, name, onProgress: progressChannel(onProgress) },
    (answer) => ({ state: "ready", answer }),
  );
}
