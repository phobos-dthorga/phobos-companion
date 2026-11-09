import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Failure } from "../shell/types";
import type {
  CatalogueReading,
  ReportEntry,
  ReportResult,
  RunReading,
} from "./types";

/** The reports the host offers for a game. */
export async function readCatalogue(game: string): Promise<CatalogueReading> {
  if (!isTauri()) return { state: "browser" };
  try {
    const entries = await invoke<ReportEntry[]>("report_catalogue", { game });
    return { state: "ready", entries };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}

/** Asks the host to run one report. The host decides whether it may. */
export async function runReport(
  game: string,
  entry: ReportEntry,
  top: number,
): Promise<RunReading> {
  try {
    const result = await invoke<ReportResult>("run_report", {
      game,
      command: entry.command,
      report: entry.report,
      top,
    });
    return { state: "ready", result };
  } catch (failure) {
    return { state: "failed", failure: failure as Failure };
  }
}
