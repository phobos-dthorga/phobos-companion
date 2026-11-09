import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import catalogue from "../../../locales/en-AU.json";
import { t } from "./runtime";

function sources(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(svelte|ts)$/.test(entry.name) && !entry.name.endsWith(".test.ts")
      ? [path]
      : [];
  });
}

const code = sources("src")
  .map((path) => readFileSync(path, "utf-8"))
  .join("\n");
const keys = Object.keys(catalogue.messages);
const used = [...code.matchAll(/\bt\("([a-z0-9-]+)"/g)].map(
  (match) => match[1],
);
const named = [...code.matchAll(/"(failure-[a-z-]+)"/g)].map(
  (match) => match[1],
);

describe("the message catalogue", () => {
  it("has every key the code asks for", () => {
    expect(used.filter((key) => !keys.includes(key))).toEqual([]);
  });

  it("has no key the code never asks for", () => {
    const failureKeys = (key: string) => key.startsWith("failure-");
    expect(
      keys.filter((key) => !failureKeys(key) && !used.includes(key)),
    ).toEqual([]);
  });

  it("names only failure messages that exist", () => {
    expect(named.filter((key) => !keys.includes(key))).toEqual([]);
  });

  it("counts in words a person would say", () => {
    expect(t("tools-found", { count: 1 })).toBe("One tool found.");
    expect(t("tools-found", { count: 15 })).toBe("15 tools found.");
  });
});
