import { describe, expect, it } from "vitest";
import { bytesOf, parseBbcode } from "./bbcode";

describe("a Workshop page's BBCode", () => {
  it("reads the page's own tags and keeps the text between them", () => {
    expect(parseBbcode("[h1]Title[/h1]\n[b]Version:[/b] 1.2.0")).toEqual([
      { kind: "h1", children: [{ kind: "text", text: "Title" }] },
      { kind: "b", children: [{ kind: "text", text: "Version:" }] },
      { kind: "text", text: " 1.2.0" },
    ]);
  });

  it("makes a list of items", () => {
    expect(parseBbcode("[list]\n[*]One\n[*]Two\n[/list]\nAfter")).toEqual([
      {
        kind: "list",
        children: [
          { kind: "item", children: [{ kind: "text", text: "One" }] },
          { kind: "item", children: [{ kind: "text", text: "Two" }] },
        ],
      },
      { kind: "text", text: "After" },
    ]);
  });

  it("keeps a link's address but only an absolute http one", () => {
    expect(parseBbcode("[url=https://example.com/a]here[/url]")).toEqual([
      {
        kind: "url",
        url: "https://example.com/a",
        children: [{ kind: "text", text: "here" }],
      },
    ]);
    expect(parseBbcode("[url=javascript:alert(1)]x[/url]")).toEqual([
      { kind: "text", text: "[url=javascript:alert(1)]x[/url]" },
    ]);
  });

  it("leaves anything it does not know, or that is not closed right, as plain text", () => {
    expect(parseBbcode("<script>[blink]x[/blink] [/b] [*]")).toEqual([
      { kind: "text", text: "<script>[blink]x[/blink] [/b] [*]" },
    ]);
    expect(parseBbcode("[b=1]x")).toEqual([{ kind: "text", text: "[b=1]x" }]);
  });

  it("closes what is left open at the end", () => {
    expect(parseBbcode("[b]bold [i]both")).toEqual([
      {
        kind: "b",
        children: [
          { kind: "text", text: "bold " },
          { kind: "i", children: [{ kind: "text", text: "both" }] },
        ],
      },
    ]);
  });

  it("counts bytes as Steam does", () => {
    expect(bytesOf("abc")).toBe(3);
    expect(bytesOf("“quoted”")).toBe(12);
  });
});
