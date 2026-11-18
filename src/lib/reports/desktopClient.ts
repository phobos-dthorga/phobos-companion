import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
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
