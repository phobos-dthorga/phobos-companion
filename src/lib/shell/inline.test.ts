import { describe, expect, it } from "vitest";
import { commitRuns, inlineSegments, plainText } from "./inline";

describe("a changelog entry's own marks", () => {
  it("shows bold and code as such, and the rest as written", () => {
    expect(
      inlineSegments(
        "**Cabin oxygen**, a fitting; it turns back and **lands there**. Uses `Feeds`.",
      ),
    ).toEqual([
      { text: "Cabin oxygen", style: "bold" },
      { text: ", a fitting; it turns back and ", style: "plain" },
      { text: "lands there", style: "bold" },
      { text: ". Uses ", style: "plain" },
      { text: "Feeds", style: "code" },
      { text: ".", style: "plain" },
    ]);
  });

  it("leaves a lone or unclosed mark alone", () => {
    expect(plainText("2 * 3 and **open")).toBe("2 * 3 and **open");
    expect(inlineSegments("x ** y")).toEqual([
      { text: "x ** y", style: "plain" },
    ]);
  });

  it("never treats the text as markup", () => {
    expect(inlineSegments("**<b>bold</b>**")).toEqual([
      { text: "<b>bold</b>", style: "bold" },
    ]);
  });

  it("gives the words without the marks", () => {
    expect(plainText("**Boats float.** On `water`.")).toBe(
      "Boats float. On water.",
    );
  });
});

describe("entries one commit wrote", () => {
  it("groups neighbours from the same commit, and keeps the order", () => {
    const runs = commitRuns([
      { id: 1, commit: "a" },
      { id: 2, commit: "a" },
      { id: 3, commit: "b" },
      { id: 4, commit: "a" },
      { id: 5, commit: null },
      { id: 6 },
    ]);
    expect(runs.map((run) => run.map((item) => item.id))).toEqual([
      [1, 2],
      [3],
      [4],
      [5, 6],
    ]);
  });
});
