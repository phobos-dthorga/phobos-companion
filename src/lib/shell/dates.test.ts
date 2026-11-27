import { describe, expect, it } from "vitest";
import { formatUtcMinute, formatWhen } from "./dates";

describe("formatUtcMinute (0.104.0)", () => {
  it("reads the tools' minute as UTC, and shows anything else as it came", () => {
    expect(formatUtcMinute("2026-11-19 18:51")).toBe(
      formatWhen("2026-11-19T18:51:00Z"),
    );
    expect(formatUtcMinute("not a time")).toBe("not a time");
    expect(formatUtcMinute(null)).toBe("");
  });
});
