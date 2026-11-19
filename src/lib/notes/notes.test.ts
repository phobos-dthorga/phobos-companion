import { describe, expect, it } from "vitest";
import { noteStamp } from "./notes";

describe("noteStamp", () => {
  it("names a note by the owner's own clock, so notes sort by when", () => {
    expect(noteStamp(new Date(2026, 10, 19, 9, 5, 7))).toBe("20261119-090507");
    expect(noteStamp(new Date(2026, 0, 2, 23, 59, 59))).toBe("20260102-235959");
  });
});
