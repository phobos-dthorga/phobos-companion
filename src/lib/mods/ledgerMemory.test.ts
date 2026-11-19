import { beforeEach, describe, expect, it } from "vitest";
import { remember, remembered } from "./ledgerMemory";

describe("the settings list kept for the next opening", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    } as Storage;
  });

  it("gives back what was kept for a game, and nothing for another", () => {
    remember("rimworld", [{ repository: "r", seen: ["a"], settings: [] }]);
    expect(remembered("rimworld")?.[0].seen).toEqual(["a"]);
    expect(remembered("kenshi")).toBeNull();
  });

  it("waits for the read when storage is refused or holds something else", () => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: () => {
        throw new Error("refused");
      },
      setItem: () => {
        throw new Error("refused");
      },
    } as unknown as Storage;
    expect(() => remember("rimworld", [])).not.toThrow();
    expect(remembered("rimworld")).toBeNull();
  });
});
