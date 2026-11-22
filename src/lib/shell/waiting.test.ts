import { describe, expect, it } from "vitest";
import { counted } from "./waiting";

describe("what waits on you", () => {
  it("keeps only counts above nought, so nothing waiting and unknown show no mark", () => {
    expect(counted({ decisions: 3, picks: 0, tests: null, mods: 2 })).toEqual({
      decisions: 3,
      mods: 2,
    });
  });
});
