import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { UpdatesReading, UpdatesStatus } from "./types";

type Status = { state: "ready"; status: UpdatesStatus } | Failed;
const ready = (status: UpdatesStatus) => ({ state: "ready" as const, status });

/** How the updater stands (0.85.0). Only reads. */
export async function readUpdates(): Promise<UpdatesReading> {
  if (inBrowser()) return BROWSER;
  return ask<UpdatesStatus, Status>("updates_status", {}, ready);
}

/** Looks for a newer published version again, on the person's press. */
export async function checkUpdates(): Promise<Status> {
  return ask<UpdatesStatus, Status>("updates_check", {}, ready);
}

/** Installs the update that is ready, at once: the program closes and the new version opens. */
export async function installUpdate(): Promise<{ state: "ready" } | Failed> {
  return ask<null, { state: "ready" } | Failed>("updates_install", {}, () => ({
    state: "ready",
  }));
}
