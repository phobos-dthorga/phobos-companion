import { describe, expect, it } from "vitest";
import {
  LOADING_MARK,
  pictureName,
  problemText,
  UNREADABLE_PICTURE,
  pictureScale,
  SETTLED_LOOKS,
  settledLooks,
  stillLoading,
} from "./capture";

describe("pictures of a page", () => {
  it("says a picture that would not load in words, never as [object Event]", () => {
    expect(problemText(new Event("error"), "a picture could not be read")).toBe(
      "a picture could not be read",
    );
    expect(problemText(new Error("the page could not be drawn"), "x")).toBe(
      "the page could not be drawn",
    );
    expect(problemText("refused", "x")).toBe("refused");
  });

  it("marks a picture it cannot read with a crossed box, drawn from data the policy always allows", () => {
    expect(UNREADABLE_PICTURE.startsWith("data:image/svg+xml;base64,")).toBe(
      true,
    );
    expect(atob(UNREADABLE_PICTURE.split(",")[1])).toContain("<path");
  });

  it("names a picture by game, page and when, so pictures sort by when they were taken", () => {
    expect(
      pictureName("RimWorld", "Make-up", new Date(2026, 10, 19, 8, 5, 9)),
    ).toBe("RimWorld Make-up 2026-11-19 08.05.09");
    expect(pictureName("", "Home", new Date(2026, 0, 2, 13, 0, 0))).toBe(
      "Home 2026-01-02 13.00.00",
    );
  });

  it("draws at the screen's sharpness, never past twice", () => {
    expect(pictureScale(1)).toBe(1);
    expect(pictureScale(1.5)).toBe(1.5);
    expect(pictureScale(3)).toBe(2);
    expect(pictureScale(0)).toBe(1);
  });

  it("waits while the page shows a bar or a placeholder, and until it has stayed loaded for two looks", () => {
    const loading = {
      querySelector: (s: string) => (s === LOADING_MARK ? {} : null),
    };
    const loaded = { querySelector: () => null };
    expect(stillLoading(loading)).toBe(true);
    expect(stillLoading(loaded)).toBe(false);
    let looks = settledLooks(0, false);
    expect(looks).toBeLessThan(SETTLED_LOOKS);
    looks = settledLooks(looks, true);
    expect(looks).toBe(0);
    looks = settledLooks(settledLooks(looks, false), false);
    expect(looks).toBe(SETTLED_LOOKS);
  });
});
