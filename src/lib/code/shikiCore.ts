import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { LanguageRegistration, ThemeRegistration } from "shiki/core";
import { GRAMMAR_OF } from "./languages";
import type { Piece } from "./presentation";
import table from "./scopeRoles.json";

/**
 * The only module that imports Shiki (0.76.0; docs/code-reading.md, step 1). It reads code with VS Code's own grammars and says,
 * for each piece, which of the theme's code colours it takes: never a colour itself. `highlightCore.ts` runs it in a worker, or
 * here in the window where no worker can start.
 *
 * Shiki resolves a token's scopes against `scopeRoles.json`'s selectors as VS Code resolves a theme, so each role is written into
 * a theme of stand-in colours, one a role, and read back from the colour Shiki gives. The JavaScript engine is used, so nothing
 * needs WebAssembly; a pattern it cannot read is skipped rather than failing the file.
 */

/** Each grammar, fetched the first time a file of it is opened. */
const LOADERS: Record<
  string,
  () => Promise<{ default: LanguageRegistration[] }>
> = {
  csharp: () => import("@shikijs/langs/csharp"),
  xml: () => import("@shikijs/langs/xml"),
  svelte: () => import("@shikijs/langs/svelte"),
  lua: () => import("@shikijs/langs/lua"),
  python: () => import("@shikijs/langs/python"),
  rust: () => import("@shikijs/langs/rust"),
  typescript: () => import("@shikijs/langs/typescript"),
  javascript: () => import("@shikijs/langs/javascript"),
  java: () => import("@shikijs/langs/java"),
  cpp: () => import("@shikijs/langs/cpp"),
  c: () => import("@shikijs/langs/c"),
  go: () => import("@shikijs/langs/go"),
  powershell: () => import("@shikijs/langs/powershell"),
  shellscript: () => import("@shikijs/langs/shellscript"),
  bat: () => import("@shikijs/langs/bat"),
  sql: () => import("@shikijs/langs/sql"),
  json: () => import("@shikijs/langs/json"),
  toml: () => import("@shikijs/langs/toml"),
  ini: () => import("@shikijs/langs/ini"),
  yaml: () => import("@shikijs/langs/yaml"),
  css: () => import("@shikijs/langs/css"),
  markdown: () => import("@shikijs/langs/markdown"),
};

export const CODE_ROLE_NAMES: readonly string[] = table.roles;
const THEME_NAME = "companion-code-roles";

/** A role's stand-in colour: its place in the list, which no real theme colour needs to be. */
function standIn(role: string): string {
  return `#0000${(CODE_ROLE_NAMES.indexOf(role) + 1).toString(16).padStart(2, "0")}`;
}

const ROLE_OF = new Map(
  CODE_ROLE_NAMES.map((role, index) => [standIn(role), index]),
);
const PLAIN = CODE_ROLE_NAMES.indexOf("plain");

const ROLE_THEME: ThemeRegistration = {
  name: THEME_NAME,
  type: "dark",
  fg: standIn("plain"),
  bg: "#000000",
  settings: [
    { settings: { foreground: standIn("plain"), background: "#000000" } },
    ...table.rules.map((rule) => ({
      scope: rule.scopes,
      settings: { foreground: standIn(rule.role) },
    })),
    ...table.styles.map((style) => ({
      scope: style.scopes,
      settings: { fontStyle: style.fontStyle },
    })),
  ],
};

let highlighter: Promise<HighlighterCore> | null = null;
const ready = new Map<string, Promise<boolean>>();

function core(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    themes: [ROLE_THEME],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighter;
}

function load(grammar: string): Promise<boolean> {
  let loading = ready.get(grammar);
  if (!loading) {
    const loader = LOADERS[grammar];
    loading = loader
      ? Promise.all([core(), loader()]).then(async ([shiki, module]) => {
          await shiki.loadLanguage(...module.default);
          return true;
        })
      : Promise.resolve(false);
    ready.set(grammar, loading);
  }
  return loading;
}

/** The grammars this module can fetch, for the tests that hold `languages.ts` to it. */
export const GRAMMARS: readonly string[] = Object.keys(LOADERS);

/**
 * Code as pieces, a list a line: each piece's text, its role's place in the theme's code colours, and Shiki's style bits (italic
 * 1, bold 2, underline 4, struck through 8). Null when the kind of file has no grammar or it could not be read: the caller then
 * shows the text plain, so a failure costs only the colours.
 */
export async function tokenise(
  language: string,
  code: string,
): Promise<Piece[][] | null> {
  const grammar = GRAMMAR_OF[language];
  if (!grammar) return null;
  try {
    if (!(await load(grammar))) return null;
    const shiki = await core();
    return shiki
      .codeToTokensBase(code, { lang: grammar, theme: THEME_NAME })
      .map((line) =>
        line.map((token): Piece => [
          token.content,
          ROLE_OF.get((token.color ?? "").toLowerCase()) ?? PLAIN,
          Math.max(0, token.fontStyle ?? 0),
        ]),
      );
  } catch {
    return null;
  }
}
