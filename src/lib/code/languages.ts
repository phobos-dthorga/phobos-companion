/**
 * The kinds of file the code viewer colours (0.76.0): the tool kit's name for each, and the VS Code grammar that reads it. Kept
 * apart from `shikiCore.ts` so asking whether a file is coloured never loads the highlighter. A name with no grammar here is shown
 * as plain text.
 */
export const GRAMMAR_OF: Readonly<Record<string, string>> = {
  csharp: "csharp",
  xml: "xml",
  svelte: "svelte",
  lua: "lua",
  python: "python",
  rust: "rust",
  typescript: "typescript",
  javascript: "javascript",
  java: "java",
  cpp: "cpp",
  c: "c",
  go: "go",
  powershell: "powershell",
  bash: "shellscript",
  dos: "bat",
  sql: "sql",
  json: "json",
  toml: "toml",
  ini: "ini",
  yaml: "yaml",
  css: "css",
  markdown: "markdown",
};

/** Whether a kind of file is coloured here. */
export function hasGrammar(language: string): boolean {
  return Object.hasOwn(GRAMMAR_OF, language);
}
