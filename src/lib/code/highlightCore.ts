import type { HLJSApi, LanguageFn } from "highlight.js";
import { splitHighlighted } from "./presentation";

/**
 * The only module that imports highlight.js, and only when code is first shown. It turns code into HTML whose spans carry
 * highlight.js's token classes; the viewer colours those classes from the theme's roles, so no colour lives here.
 *
 * Each language is fetched the first time a file of it is opened. The kit names what a file is (csharp, lua, xml...); a
 * name with no grammar here is shown as plain text.
 */
const GRAMMARS: Record<string, () => Promise<{ default: LanguageFn }>> = {
  csharp: () => import("highlight.js/lib/languages/csharp"),
  xml: () => import("highlight.js/lib/languages/xml"),
  svelte: () => import("highlight.js/lib/languages/xml"),
  lua: () => import("highlight.js/lib/languages/lua"),
  python: () => import("highlight.js/lib/languages/python"),
  rust: () => import("highlight.js/lib/languages/rust"),
  typescript: () => import("highlight.js/lib/languages/typescript"),
  javascript: () => import("highlight.js/lib/languages/javascript"),
  java: () => import("highlight.js/lib/languages/java"),
  cpp: () => import("highlight.js/lib/languages/cpp"),
  c: () => import("highlight.js/lib/languages/c"),
  go: () => import("highlight.js/lib/languages/go"),
  powershell: () => import("highlight.js/lib/languages/powershell"),
  bash: () => import("highlight.js/lib/languages/bash"),
  dos: () => import("highlight.js/lib/languages/dos"),
  sql: () => import("highlight.js/lib/languages/sql"),
  json: () => import("highlight.js/lib/languages/json"),
  toml: () => import("highlight.js/lib/languages/ini"),
  ini: () => import("highlight.js/lib/languages/ini"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
  css: () => import("highlight.js/lib/languages/css"),
  markdown: () => import("highlight.js/lib/languages/markdown"),
};

let core: Promise<HLJSApi> | null = null;
const ready = new Map<string, Promise<boolean>>();

function loadCore(): Promise<HLJSApi> {
  core ??= import("highlight.js/lib/core").then((module) => module.default);
  return core;
}

function loadGrammar(language: string): Promise<boolean> {
  let loading = ready.get(language);
  if (!loading) {
    const grammar = GRAMMARS[language];
    loading = grammar
      ? Promise.all([loadCore(), grammar()]).then(([hljs, module]) => {
          hljs.registerLanguage(language, module.default);
          return true;
        })
      : Promise.resolve(false);
    ready.set(language, loading);
  }
  return loading;
}

/** Whether a kind of file is coloured here. */
export function hasGrammar(language: string): boolean {
  return language in GRAMMARS;
}

/**
 * Code as one piece of HTML per line, or null when the language has no grammar here or the highlighter could not be loaded:
 * the caller then shows the text plain, so a failure costs only the colours.
 */
export async function highlightLines(
  language: string,
  code: string,
): Promise<string[] | null> {
  try {
    if (!(await loadGrammar(language))) return null;
    const hljs = await loadCore();
    const { value } = hljs.highlight(code, { language, ignoreIllegals: true });
    return splitHighlighted(value);
  } catch {
    return null;
  }
}
