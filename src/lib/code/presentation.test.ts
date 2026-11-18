import { describe, expect, it } from "vitest";
import {
  byKind,
  entryParts,
  escapeHtml,
  firstFile,
  hunkHtml,
  isTest,
  pathParts,
  shownLines,
  sides,
  splitHighlighted,
  writtenWords,
} from "./presentation";
import type { FileChange, Hunk } from "./types";

function file(
  path: string,
  kind: FileChange["kind"],
  additions = 0,
): FileChange {
  return {
    path,
    oldPath: null,
    change: "changed",
    kind,
    language: "plain",
    binary: false,
    additions,
    deletions: 0,
    hunks: [],
    truncated: false,
  };
}

const hunk: Hunk = {
  header: "void Turn()",
  lines: [
    { kind: " ", old: 1, new: 1, text: "class Wheel" },
    { kind: "-", old: 2, new: null, text: "  void Turn() { }" },
    { kind: "+", old: null, new: 2, text: "  void Turn() { Spin(); }" },
    { kind: "+", old: null, new: 3, text: "  // a <b> & c" },
  ],
};

describe("highlighted code, line by line", () => {
  it("keeps each line's spans balanced when one runs over a line break", () => {
    const html =
      '<span class="k">class</span> A\n<span class="c">/* one\ntwo */</span> x';
    expect(splitHighlighted(html)).toEqual([
      '<span class="k">class</span> A',
      '<span class="c">/* one</span>',
      '<span class="c">two */</span> x',
    ]);
  });

  it("reopens every open span, innermost last", () => {
    const html = '<span class="a">x<span class="b">y\nz</span></span>';
    expect(splitHighlighted(html)).toEqual([
      '<span class="a">x<span class="b">y</span></span>',
      '<span class="a"><span class="b">z</span></span>',
    ]);
  });

  it("gives a single line back whole", () => {
    expect(splitHighlighted("plain")).toEqual(["plain"]);
  });
});

describe("a hunk's two sides", () => {
  it("is the code as it was and as it now stands", () => {
    expect(sides(hunk)).toEqual({
      old: "class Wheel\n  void Turn() { }",
      new: "class Wheel\n  void Turn() { Spin(); }\n  // a <b> & c",
    });
  });

  it("takes a removed line from the old side and every other from the new", () => {
    const html = hunkHtml(
      hunk,
      ["OLD-1", "OLD-2"],
      ["NEW-1", "NEW-2", "NEW-3"],
    );
    expect(html).toEqual(["NEW-1", "OLD-2", "NEW-2", "NEW-3"]);
  });

  it("escapes the text when there are no colours", () => {
    expect(hunkHtml(hunk, null, null)[3]).toBe("  // a &lt;b&gt; &amp; c");
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("leaves removed lines out of the code as it now stands", () => {
    expect(shownLines(hunk, "new").map((line) => line.kind)).toEqual([
      " ",
      "+",
      "+",
    ]);
    expect(shownLines(hunk, "changes")).toHaveLength(4);
  });
});

describe("the files of a commit", () => {
  const files = [
    file("docs/notes.md", "words"),
    file("src/Small.cs", "code", 2),
    file("src/Big.cs", "code", 40),
    file("mods/Thing/Defs/Boats.xml", "data", 90),
  ];

  it("lists code first and leaves out kinds with none", () => {
    expect(byKind(files).map((group) => group.kind)).toEqual([
      "code",
      "data",
      "words",
    ]);
  });

  it("opens the code file with the most new lines", () => {
    expect(firstFile(files)?.path).toBe("src/Big.cs");
    expect(firstFile([])).toBeNull();
  });

  it("opens the code itself before its tests, however long the test", () => {
    const withTests = [
      file("tests/test_boats.py", "code", 100),
      file("src/Thing/BoatTests.cs", "code", 80),
      file("src/lib/boat.test.ts", "code", 70),
      file("src/Thing/Boat.cs", "code", 12),
    ];
    expect(firstFile(withTests)?.path).toBe("src/Thing/Boat.cs");
    expect(firstFile([file("tests/test_only.py", "code", 5)])?.path).toBe(
      "tests/test_only.py",
    );
    expect(isTest("src/Contest/Latest.cs")).toBe(false);
  });

  it("splits a path into its folder and its name", () => {
    expect(pathParts("src/Thing/Boat.cs")).toEqual({
      folder: "src/Thing/",
      name: "Boat.cs",
    });
    expect(pathParts("README.md")).toEqual({ folder: "", name: "README.md" });
  });
});

describe("an entry's words", () => {
  it("splits the bold opening from the rest", () => {
    expect(
      entryParts({ text: "**Boats float.** On water.", lead: "Boats float." }),
    ).toEqual({ lead: "Boats float.", rest: "On water." });
  });

  it("shows an entry written beside it without its marks, cut to a line", () => {
    expect(writtenWords("**Sails.** Boats have sails.")).toBe(
      "Sails. Boats have sails.",
    );
    expect(writtenWords("x".repeat(200), 20)).toBe(`${"x".repeat(20)}…`);
  });
});
