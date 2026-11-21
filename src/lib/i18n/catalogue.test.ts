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
const asked = [
  ...code.matchAll(/\bt\(\s*"([a-z0-9-]+)"/g),
  ...code.matchAll(/\bkey: "([a-z0-9-]+)"/g),
  ...code.matchAll(/"((?:failure|repo-problem)-[a-z-]+)"/g),
].map((match) => match[1]);

describe("the message catalogue", () => {
  it("has no key twice (JSON keeps only the last, so the first meaning is lost)", () => {
    const raw = readFileSync("locales/en-AU.json", "utf-8");
    const all = [...raw.matchAll(/^ {4}"([^"]+)":/gm)].map((m) => m[1]);
    expect(all.filter((key, i) => all.indexOf(key) !== i)).toEqual([]);
  });

  it("has every key the code asks for", () => {
    expect(asked.filter((key) => !keys.includes(key))).toEqual([]);
  });

  it("has no key the code never mentions", () => {
    expect(keys.filter((key) => !code.includes(`"${key}"`))).toEqual([]);
  });

  it("counts in words a person would say", () => {
    expect(t("tools-found", { count: 1 })).toBe("One tool found.");
    expect(t("tools-found", { count: 15 })).toBe("15 tools found.");
    expect(t("unfinished-files", { count: 1 })).toBe(
      "One file changed but not committed",
    );
    expect(t("pending-earlier", { count: 3 })).toBe("and 3 earlier drafts");
  });

  // 0.42.4: Fluent drops the spaces that open a variant, so a variant that needs one says so with {" "}.
  it("keeps the space before a variant that opens with one", () => {
    expect(t("check-xml-ok", { count: 414, patched: 7 })).toBe(
      "All 414 things our XML patches name are still there (7 of them only once other patches have run).",
    );
    expect(t("check-xml-ok", { count: 414, patched: 0 })).toBe(
      "All 414 things our XML patches name are still there.",
    );
  });
});
