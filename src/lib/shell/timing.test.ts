import { beforeEach, describe, expect, it } from "vitest";
import { estimate, expectedMs, remember } from "./timing";

describe("remembered timings", () => {
  beforeEach(() => {
    const kept = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => kept.get(k) ?? null,
      setItem: (k: string, v: string) => void kept.set(k, v),
      removeItem: (k: string) => void kept.delete(k),
      clear: () => kept.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  });

  it("remembers work worth timing, leaning on the latest run", () => {
    expect(expectedMs("Reading the log")).toBeNull();
    remember("Reading the log", 4000);
    expect(expectedMs("Reading the log")).toBe(4000);
    remember("Reading the log", 2000);
    expect(expectedMs("Reading the log")).toBe(3000);
    remember("Quick", 100);
    expect(expectedMs("Quick")).toBeNull();
  });

  it("fills against what it took before, short of full, and says what is left", () => {
    expect(estimate(1000, 4000)).toEqual({ share: 0.25, secondsLeft: 3 });
    expect(estimate(5000, 4000)).toEqual({ share: 0.95, secondsLeft: null });
  });

  it("works without storage", () => {
    // @ts-expect-error: a window whose storage is refused
    globalThis.localStorage = undefined;
    remember("Reading the log", 4000);
    expect(expectedMs("Reading the log")).toBeNull();
  });
});
