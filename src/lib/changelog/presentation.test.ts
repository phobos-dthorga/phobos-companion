import { describe, expect, it } from "vitest";
import { releasedCount, sections, versionWords } from "./presentation";

describe("showing a changelog", () => {
  it("puts entries under their sections, in the order the sections first appear", () => {
    const found = sections([
      { lead: "a", section: "Added" },
      { lead: "b", section: "Fixed" },
      { lead: "c", section: "Added" },
    ]);
    expect(found.map((s) => [s.section, s.entries.map((e) => e.lead)])).toEqual(
      [
        ["Added", ["a", "c"]],
        ["Fixed", ["b"]],
      ],
    );
  });

  it("writes the entries not yet in a version in words, and leaves them out of the count", () => {
    expect(versionWords("Unreleased")).toBe("Not yet in a version");
    expect(versionWords("0.16.0")).toBe("0.16.0");
    expect(versionWords(undefined)).toBe("");
    expect(
      releasedCount([
        { version: "Unreleased" },
        { version: "0.2.0" },
        { version: "0.1.0" },
      ]),
    ).toBe(2);
  });
});
