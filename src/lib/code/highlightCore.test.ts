import { describe, expect, it } from "vitest";
import { useCodeColours, type CodeSet } from "./codeColours";
import { hasGrammar, highlightLines } from "./highlightCore";
import { GRAMMAR_OF } from "./languages";
import { GRAMMARS, tokenise } from "./shikiCore";
import table from "./scopeRoles.json";

/** The role each piece of `code` was given, by its text, for pieces that are not blank. */
async function rolesOf(
  language: string,
  code: string,
): Promise<Map<string, string>> {
  const lines = await tokenise(language, code);
  expect(lines).not.toBeNull();
  const found = new Map<string, string>();
  for (const line of lines!)
    for (const [text, role] of line)
      if (text.trim()) found.set(text.trim(), table.roles[role]);
  return found;
}

describe("the highlighter", () => {
  it("colours C# where VS Code's Dark+ would, one piece of HTML a line", async () => {
    const lines = await highlightLines(
      "csharp",
      'class Boat\n{\n    string name = "Audeamus"; // afloat\n}',
    );
    expect(lines).toHaveLength(4);
    expect(lines![0]).toContain('<span class="tok-keyword">class</span>');
    expect(lines![2]).toContain('<span class="tok-string">"Audeamus"</span>');
    expect(lines![2]).toContain('<span class="tok-comment">// afloat</span>');
  });

  it("tells flow words, types, methods, variables, numbers and constants apart, as Dark+ does", async () => {
    const roles = await rolesOf(
      "csharp",
      [
        "public class Boat : Hull",
        "{",
        "    public int Sail(int knots)",
        "    {",
        "        if (knots > 3) return Sail(knots - 1);",
        "        return Speed.Fast;",
        "    }",
        "    enum Speed { Fast }",
        "}",
      ].join("\n"),
    );
    expect(roles.get("public")).toBe("keyword");
    expect(roles.get("Boat")).toBe("type");
    expect(roles.get("Hull")).toBe("type");
    expect(roles.get("Sail")).toBe("function");
    expect(roles.get("knots")).toBe("variable");
    expect(roles.get("if")).toBe("flow");
    expect(roles.get("return")).toBe("flow");
    expect(roles.get("3")).toBe("number");
    expect(roles.get("int")).toBe("keyword");
  });

  it("colours XML tags and Lua's keywords and comments, the other languages most mods are written in", async () => {
    const xml = await highlightLines(
      "xml",
      "<Defs>\n  <defName>Boat</defName>\n</Defs>",
    );
    expect(xml![1]).toContain('<span class="tok-tag">defName</span>');
    const lua = await highlightLines("lua", "local boats = 3 -- afloat");
    expect(lua![0]).toContain('<span class="tok-keyword">local</span>');
    expect(lua![0]).toContain("tok-comment");
  });

  it("never lets code become markup", async () => {
    const lines = await highlightLines("csharp", 'var a = "<script>";');
    expect(lines![0]).not.toContain("<script>");
    expect(lines![0]).toContain("&lt;script&gt;");
  });

  it("keeps one line of HTML for each line of code, blank lines included", async () => {
    const lines = await highlightLines("python", "a = 1\n\n\nb = 2\n");
    expect(lines).toHaveLength(5);
    expect(lines![1]).toBe("");
  });

  it("colours code in a set brought in from a VS Code theme, once it is in use, and in the theme's own again after", async () => {
    const set: CodeSet = {
      id: "hand-made",
      name: "Hand made",
      plain: "#CCCCCC",
      rules: [
        { scope: ["keyword.control"], foreground: "#C586C0" },
        { scope: ["string"], foreground: "#CE9178", fontStyle: "italic" },
      ],
      replaced: 0,
      notes: [],
    };
    useCodeColours(set);
    const lines = await highlightLines("csharp", 'if (a) return "x";');
    expect(lines![0]).toContain('<span style="color:#C586C0">if</span>');
    expect(lines![0]).toContain(
      '<span class="tok-italic" style="color:#CE9178">"x"</span>',
    );
    useCodeColours(null);
    expect((await highlightLines("csharp", "if (a) {}"))![0]).toContain(
      '<span class="tok-flow">if</span>',
    );
  });

  it("says when a kind of file has no grammar, so it is shown plain", async () => {
    expect(hasGrammar("csharp")).toBe(true);
    expect(hasGrammar("plain")).toBe(false);
    expect(hasGrammar("toString")).toBe(false);
    expect(await highlightLines("plain", "just words")).toBeNull();
  });
});

describe("every kind of file the code viewer colours", () => {
  it("has a grammar the highlighter can fetch", () => {
    expect([...new Set(Object.values(GRAMMAR_OF))].sort()).toEqual(
      [...GRAMMARS].sort(),
    );
  });

  const SAMPLES: Record<string, string> = {
    csharp: "int x = 1;",
    xml: '<a b="c"/>',
    svelte: '<script lang="ts">let a = 1;</script>\n<p>{a}</p>',
    lua: "local a = 1",
    python: "def a(): return 1",
    rust: "fn a() -> i32 { 1 }",
    typescript: "const a: number = 1;",
    javascript: "const a = 1;",
    java: "int a = 1;",
    cpp: "int a = 1;",
    c: "int a = 1;",
    go: "func a() int { return 1 }",
    powershell: "$a = 1",
    bash: "a=1; echo $a",
    dos: "set A=1",
    sql: "SELECT 1;",
    json: '{"a": 1}',
    toml: "a = 1",
    ini: "[a]\nb=1",
    yaml: "a: 1",
    css: "a { color: red; }",
    markdown: "# A\n\n**b**",
  };

  for (const language of Object.keys(GRAMMAR_OF)) {
    it(`${language} is read and coloured, with VS Code's grammar and no WebAssembly`, async () => {
      const lines = await tokenise(language, SAMPLES[language]);
      expect(lines).not.toBeNull();
      const roles = lines!.flat().map(([, role]) => table.roles[role]);
      expect(roles.some((role) => role !== "plain")).toBe(true);
    });
  }
});
