import { describe, expect, it } from "vitest";
import { hasGrammar, highlightLines } from "./highlightCore";

describe("the highlighter", () => {
  it("colours C# by what each piece is, one piece of HTML a line", async () => {
    const lines = await highlightLines(
      "csharp",
      'class Boat\n{\n    string name = "Audeamus"; // afloat\n}',
    );
    expect(lines).toHaveLength(4);
    expect(lines![0]).toContain('<span class="hljs-keyword">class</span>');
    expect(lines![2]).toContain("hljs-string");
    expect(lines![2]).toContain("hljs-comment");
  });

  it("colours XML and Lua, the other languages most mods are written in", async () => {
    const xml = await highlightLines(
      "xml",
      "<Defs>\n  <defName>Boat</defName>\n</Defs>",
    );
    expect(xml![1]).toContain("hljs-name");
    const lua = await highlightLines("lua", "local boats = 3 -- afloat");
    expect(lua![0]).toContain("hljs-keyword");
  });

  it("never lets code become markup", async () => {
    const lines = await highlightLines("csharp", 'var a = "<script>";');
    expect(lines![0]).not.toContain("<script>");
    expect(lines![0]).toContain("&lt;script&gt;");
  });

  it("says when a kind of file has no grammar, so it is shown plain", async () => {
    expect(hasGrammar("csharp")).toBe(true);
    expect(hasGrammar("plain")).toBe(false);
    expect(await highlightLines("plain", "just words")).toBeNull();
  });
});
