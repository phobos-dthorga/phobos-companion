import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAGE_NAMES } from "../navigation/place";

describe("setup pages", () => {
  it("names only pages the Companion has (config/setup-pages.json, 0.88.0)", () => {
    const file = JSON.parse(
      readFileSync("config/setup-pages.json", "utf-8"),
    ) as { pages: Record<string, string[]> };
    const known: readonly string[] = PAGE_NAMES;
    for (const [key, pages] of Object.entries(file.pages))
      for (const page of pages)
        expect(known, `${key}: ${page}`).toContain(page);
  });
});
