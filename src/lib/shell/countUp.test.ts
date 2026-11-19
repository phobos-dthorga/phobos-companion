import { describe, expect, it } from "vitest";
import { countedAt } from "./countUp";

describe("figures that count up", () => {
  it("starts where it was, slows as it arrives, and lands on the value", () => {
    expect(countedAt(0, 1000, 0)).toBe(0);
    const half = countedAt(0, 1000, 350);
    expect(half).toBeGreaterThan(500);
    expect(half).toBeLessThan(1000);
    expect(countedAt(0, 1000, 700)).toBe(1000);
    expect(countedAt(200, 100, 5000)).toBe(100);
  });
});
