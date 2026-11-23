import { describe, expect, it } from "vitest";
import type { CodeName, Names } from "../connections/types";
import {
  asCandidate,
  inside,
  languageOf,
  namesByLine,
  nodeIdOf,
  sameDeclaration,
  step,
  wrapNames,
} from "./names";

function name(over: Partial<CodeName>): CodeName {
  return {
    line: 1,
    column: 0,
    length: 1,
    text: "x",
    kind: "method",
    display: "x",
    here: false,
    declared: {},
    ...over,
  };
}

describe("names in a coloured line", () => {
  it("wraps each name in a mark, counting entities as one character and tags as none", () => {
    const html =
      '<span class="tok-keyword">if</span> (a &lt; <span class="tok-function">Float</span>(b))';
    // "if (a < Float(b))": a at 4, Float at 8, b at 14.
    const wrapped = wrapNames(html, [
      { start: 4, end: 5, index: 0 },
      { start: 8, end: 13, index: 1 },
      { start: 14, end: 15, index: 2 },
    ]);
    expect(wrapped).toBe(
      '<span class="tok-keyword">if</span> (<span class="nm" data-name="0">a</span> &lt; ' +
        '<span class="tok-function"><span class="nm" data-name="1">Float</span></span>(<span class="nm" data-name="2">b</span>))',
    );
  });

  it("closes a name at a colour's edge and opens it again after, so every span closes where it opened", () => {
    const wrapped = wrapNames(
      'Fo<span class="tok-type">o</span>',
      [{ start: 0, end: 3, index: 4 }],
      (index) => (index === 4 ? "nm-chosen" : ""),
    );
    expect(wrapped).toBe(
      '<span class="nm nm-chosen" data-name="4">Fo</span><span class="tok-type"><span class="nm nm-chosen" data-name="4">o</span></span>',
    );
  });

  it("leaves a line with no names as it was", () => {
    expect(wrapNames("<b>x</b>", [])).toBe("<b>x</b>");
  });

  it("groups a reading's names by line, in the order they appear", () => {
    const names = {
      names: [
        name({ line: 2, column: 9 }),
        name({ line: 2, column: 1 }),
        name({ line: 5, column: 0 }),
      ],
    } as Names;
    const lines = namesByLine(names);
    expect(lines.get(2)!.map((r) => r.index)).toEqual([1, 0]);
    expect(lines.get(5)!).toEqual([{ start: 0, end: 1, index: 2 }]);
  });
});

describe("what a name stands for", () => {
  it("is found in the code map by its documentation id", () => {
    expect(
      nodeIdOf(name({ id: "M:NamesFixture.Core.Boat.Float(System.Int32)" })),
    ).toBe("cs:NamesFixture.Core.Boat.Float");
    expect(nodeIdOf(name({ id: "T:NamesFixture.Core.Boat" }))).toBe(
      "cs:NamesFixture.Core.Boat",
    );
    expect(nodeIdOf(name({ id: "M:A.Boat.#ctor(System.String)" }))).toBe(
      "cs:A.Boat.Boat",
    );
    expect(nodeIdOf(name({ id: "M:A.B.Make``1(``0)" }))).toBe("cs:A.B.Make");
    expect(nodeIdOf(name({ id: undefined, kind: "local" }))).toBeNull();
    // A name read by name (Lua, Python, XML) carries its thing's id.
    expect(nodeIdOf(name({ id: null, node: "lua:Lamps.shine" }))).toBe(
      "lua:Lamps.shine",
    );
  });

  it("is one declaration when its file and line agree, or its id outside this repository", () => {
    const here = { file: "src/Boat.cs", line: 4 };
    expect(
      sameDeclaration(
        name({ declared: here }),
        name({ declared: { ...here } }),
      ),
    ).toBe(true);
    expect(
      sameDeclaration(
        name({ declared: here }),
        name({ declared: { file: "src/Boat.cs", line: 9 } }),
      ),
    ).toBe(false);
    expect(
      sameDeclaration(
        name({
          id: "T:Verse.Thing",
          declared: { assembly: "Assembly-CSharp" },
        }),
        name({
          id: "T:Verse.Thing",
          declared: { assembly: "Assembly-CSharp" },
        }),
      ),
    ).toBe(true);
    expect(inside(name({ kind: "parameter" }))).toBe(true);
    expect(inside(name({ kind: "class" }))).toBe(false);
  });
});

describe("a name read by name", () => {
  const count = name({
    text: "count",
    kind: "function",
    display: "RegistryMT:count",
    node: "lua:RegistryMT:count",
    exact: false,
    declared: { file: "lua/registry.lua", line: 4, end: 9 },
    candidates: [
      {
        id: "lua:RegistryMT:count",
        name: "RegistryMT:count",
        kind: "function",
        file: "lua/registry.lua",
        line: 4,
        end: 9,
      },
      {
        id: "lua:Spray.count",
        name: "Spray.count",
        kind: "function",
        file: "lua/spray.lua",
        line: 30,
        end: 33,
      },
    ],
  });

  it("is taken as the thing chosen from those it may stand for", () => {
    const second = asCandidate(count, 1);
    expect(second.display).toBe("Spray.count");
    expect(second.declared).toEqual({
      file: "lua/spray.lua",
      line: 30,
      end: 33,
    });
    expect(nodeIdOf(second)).toBe("lua:Spray.count");
    expect(asCandidate(count, 9)).toBe(count);
  });

  it("shows a declaration's lines in its own file's language", () => {
    expect(languageOf("src/Boat.cs")).toBe("csharp");
    expect(languageOf("lua/spray.lua")).toBe("lua");
    expect(languageOf("Defs/Boats.XML")).toBe("xml");
    expect(languageOf("notes.txt")).toBe("plain");
  });
});

describe("moving between names with the keys", () => {
  const shown = [
    { index: 0, row: 0, column: 4 },
    { index: 1, row: 0, column: 20 },
    { index: 2, row: 1, column: 2 },
    { index: 3, row: 1, column: 18 },
  ];

  it("starts at the first, and moves along a line and across lines", () => {
    expect(step(shown, null, "next")).toBe(0);
    expect(step(shown, 0, "next")).toBe(1);
    expect(step(shown, 1, "next")).toBe(2);
    expect(step(shown, 2, "previous")).toBe(1);
    expect(step(shown, 3, "next")).toBeNull();
  });

  it("goes to the nearest name on the line above or below", () => {
    expect(step(shown, 1, "down")).toBe(3);
    expect(step(shown, 0, "down")).toBe(2);
    expect(step(shown, 2, "up")).toBe(0);
    expect(step(shown, 0, "up")).toBeNull();
  });
});
