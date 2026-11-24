import { describe, expect, it } from "vitest";
import { busy, megabytes, percent, releaseDay } from "./presentation";

describe("the updater as the page shows it (0.85.0)", () => {
  it("asks again only while it is at work", () => {
    expect(busy({ state: "waiting" })).toBe(true);
    expect(busy({ state: "checking" })).toBe(true);
    expect(
      busy({ state: "fetching", version: "0.86.0", got: 1, total: 2 }),
    ).toBe(true);
    expect(busy({ state: "current", checked: 1 })).toBe(false);
    expect(
      busy({ state: "ready", version: "0.86.0", notes: null, date: null }),
    ).toBe(false);
    expect(busy({ state: "off" })).toBe(false);
  });

  it("says how much is fetched, and nothing while the size is unknown", () => {
    expect(percent(5, 20)).toBe(25);
    expect(percent(20, 20)).toBe(100);
    expect(percent(5, null)).toBeNull();
    expect(percent(5, 0)).toBeNull();
    expect(megabytes(20 * 1024 * 1024)).toBe("20.0");
  });

  it("reads the release's day from either form of date", () => {
    expect(releaseDay("2026-11-25 3:14:00.0 +00:00:00")).toBe("2026-11-25");
    expect(releaseDay("2026-11-25T03:14:00.000Z")).toBe("2026-11-25");
    expect(releaseDay(null)).toBeNull();
    expect(releaseDay("yesterday")).toBeNull();
  });
});
