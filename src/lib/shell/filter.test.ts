import { describe, expect, it } from "vitest";
import { matchesFilter } from "./filter";

describe("filtering a page's list (0.110.0)", () => {
  it("keeps a thing holding every word typed, in any case and order", () => {
    expect(matchesFilter(["Vehicle Framework", "smashphil"], "")).toBe(true);
    expect(matchesFilter(["Vehicle Framework", "smashphil"], "frame veh")).toBe(
      true,
    );
    expect(matchesFilter(["Vehicle Framework", null, undefined], "SMASH")).toBe(
      false,
    );
    expect(matchesFilter(["Row 12", "Rearm one kind"], "  rearm   12 ")).toBe(
      true,
    );
  });
});
