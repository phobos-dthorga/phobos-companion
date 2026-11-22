import { describe, expect, it } from "vitest";
import { darkAndLight, fitScale } from "./viewing";

describe("fitting a picture", () => {
  it("shows a small icon whole, enlarged by a whole number", () => {
    // The owner's MealHalt icon, 128 x 128, in a frame 750 wide and 420 high: 3 times, not the 5.86 the width alone allowed.
    expect(fitScale(128, 128, 750, 420)).toBe(3);
    expect(fitScale(8, 4, 900, 450)).toBe(112);
  });

  it("shrinks a picture larger than its room, and leaves one that just fits alone", () => {
    expect(fitScale(2048, 1024, 1024, 1024)).toBe(0.5);
    expect(fitScale(600, 400, 700, 450)).toBe(1);
  });

  it("draws at its own size before the room is measured", () => {
    expect(fitScale(128, 128, 0, 0)).toBe(1);
  });

  it("finds the theme's dark and light whichever way round they are", () => {
    expect(darkAndLight("#0E0B10", "#F4EEE8")).toEqual({
      dark: "#0E0B10",
      light: "#F4EEE8",
    });
    expect(darkAndLight("#FFFFFF", "#111111")).toEqual({
      dark: "#111111",
      light: "#FFFFFF",
    });
  });
});
