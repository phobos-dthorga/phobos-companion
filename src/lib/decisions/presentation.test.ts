import { describe, expect, it } from "vitest";
import { canDecide, chosenLabel, firstChoice, grouped } from "./presentation";
import type { Decision } from "./types";

const decision: Decision = {
  id: "page-keys",
  question: "Renumber?",
  context: "",
  options: [
    { id: "renumber", label: "Renumber them", detail: "" },
    { id: "keep", label: "Keep them", detail: "" },
  ],
  lean: "renumber",
  why: "",
  from: "",
  asked: "",
  answer: null,
};

describe("decisions", () => {
  it("opens on the owner's answer, else the lean", () => {
    expect(firstChoice(decision)).toBe("renumber");
    expect(
      firstChoice({
        ...decision,
        answer: { option: "keep", words: "", time: "" },
      }),
    ).toBe("keep");
    expect(firstChoice({ ...decision, lean: null })).toBeNull();
  });

  it("names the answer, and something else in words", () => {
    expect(
      chosenLabel(
        { ...decision, answer: { option: "keep", words: "", time: "" } },
        "Something else",
      ),
    ).toBe("Keep them");
    expect(
      chosenLabel(
        { ...decision, answer: { option: "other", words: "x", time: "" } },
        "Something else",
      ),
    ).toBe("Something else");
  });

  it("asks for words with something else", () => {
    expect(canDecide(null, "")).toBe(false);
    expect(canDecide("keep", "")).toBe(true);
    expect(canDecide("other", "  ")).toBe(false);
    expect(canDecide("other", "letters")).toBe(true);
  });

  it("groups by repository, leaving out empty ones", () => {
    const found = grouped({
      waiting: 1,
      repositories: [
        { repository: "a", root: "", decisions: [decision] },
        { repository: "b", root: "", decisions: [] },
      ],
    });
    expect(found.map((r) => r.repository)).toEqual(["a"]);
    expect(found[0].open).toHaveLength(1);
  });
});
