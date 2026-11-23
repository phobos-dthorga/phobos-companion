import { ask, BROWSER, inBrowser } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type {
  CodeColoursStatus,
  Moved,
  MovedCode,
  ThemeStatus,
  VsCodeTheme,
} from "./types";

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

// ---------------------------------------------------------------- code colours from VS Code (0.77.0)

type CodeRead = { state: "ready"; status: CodeColoursStatus } | Failed;
type CodeDone = { state: "done"; moved: MovedCode } | Failed;
type Found = { state: "ready"; themes: VsCodeTheme[] } | Failed;
const codeReady = (status: CodeColoursStatus) => ({
  state: "ready" as const,
  status,
});
const codeDone = (moved: MovedCode) => ({ state: "done" as const, moved });

/** Every set of code colours kept, and the one in use made readable on the theme in use. */
export async function readCodeColours(): Promise<CodeRead | typeof BROWSER> {
  if (inBrowser()) return BROWSER;
  return ask<CodeColoursStatus, CodeRead>("code_colours_status", {}, codeReady);
}

/** Uses a kept set from now on, or the theme's own code colours ("theme"). */
export async function chooseCodeColours(id: string): Promise<CodeRead> {
  return ask<CodeColoursStatus, CodeRead>(
    "choose_code_colours",
    { id },
    codeReady,
  );
}

/** Takes away a kept set of code colours. */
export async function removeCodeColours(id: string): Promise<CodeRead> {
  return ask<CodeColoursStatus, CodeRead>(
    "remove_code_colours",
    { id },
    codeReady,
  );
}

/** The colour themes VS Code has on this computer. */
export async function findVsCodeThemes(): Promise<Found> {
  return ask<VsCodeTheme[], Found>("vscode_themes", {}, (themes) => ({
    state: "ready" as const,
    themes,
  }));
}

/** Brings in one of the themes the last listing named; the host checks it is still listed. */
export async function bringInVsCodeTheme(file: string): Promise<CodeDone> {
  return ask<MovedCode, CodeDone>("bring_in_vscode_theme", { file }, codeDone);
}

/** Opens Windows' Open dialog for a VS Code theme file; the host reads, checks, keeps and uses it. */
export async function bringInCodeColoursFile(title: string): Promise<CodeDone> {
  return ask<MovedCode, CodeDone>(
    "bring_in_code_colours_file",
    { title },
    codeDone,
  );
}
