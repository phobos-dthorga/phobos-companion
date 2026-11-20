import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { Moved, ThemeStatus } from "./types";

type Read = { state: "ready"; status: ThemeStatus } | Failed;
type Done = { state: "done"; moved: Moved } | Failed;
const ready = (status: ThemeStatus) => ({ state: "ready" as const, status });
const done = (moved: Moved) => ({ state: "done" as const, moved });

/** Every theme on offer and the one in use (0.33.0). */
export async function readThemes(): Promise<Read | typeof BROWSER> {
  if (inBrowser()) return BROWSER;
  return ask<ThemeStatus, Read>("theme_status", {}, ready);
}

/** Uses a theme from now on. */
export async function chooseTheme(id: string): Promise<Read> {
  return ask<ThemeStatus, Read>("choose_theme", { id }, ready);
}

/** Opens Windows' Open dialog for a theme file; the host checks it, keeps it and uses it. */
export async function importTheme(title: string): Promise<Done> {
  return ask<Moved, Done>("import_theme", { title }, done);
}

/** Opens Windows' Save dialog for a copy of a theme on offer. */
export async function exportTheme(id: string, title: string): Promise<Done> {
  return ask<Moved, Done>("export_theme", { id, title }, done);
}

/** Takes away a theme of the owner's. */
export async function removeTheme(id: string): Promise<Read> {
  return ask<ThemeStatus, Read>("remove_theme", { id }, ready);
}

/** Keeps a theme the owner made and uses it, once the host's checks pass. */
export async function keepTheme(text: string): Promise<Read> {
  return ask<ThemeStatus, Read>("keep_theme", { text }, ready);
}

/** Saves a theme being made, before every check passes, where the owner chooses. */
export async function exportDraft(text: string, title: string): Promise<Done> {
  return ask<Moved, Done>("export_theme_draft", { text, title }, done);
}
