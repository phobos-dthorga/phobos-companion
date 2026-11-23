import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// AGENTS.md, "The window presents, the host decides": only a desktopClient.ts may import @tauri-apps, so every page reaches
// the host through one small client that the browser checks can stand in for.

function sources(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(svelte|ts)$/.test(entry.name) && !entry.name.endsWith(".test.ts")
      ? [path]
      : [];
  });
}

const TAURI = /(?:from\s+|import\s*\(\s*|import\s+)["']@tauri-apps\//;

describe("Tauri imports", () => {
  it("are only in a desktopClient.ts", () => {
    const offenders = sources("src")
      .filter((path) => !/(^|[\\/])desktopClient\.ts$/.test(path))
      .filter((path) => TAURI.test(readFileSync(path, "utf-8")))
      .map((path) => path.replace(/\\/g, "/"));
    expect(offenders).toEqual([]);
  });

  it("recognises every form of import", () => {
    expect(TAURI.test('import { invoke } from "@tauri-apps/api/core";')).toBe(
      true,
    );
    expect(
      TAURI.test("const m = await import('@tauri-apps/plugin-dialog');"),
    ).toBe(true);
    expect(TAURI.test('import "@tauri-apps/api";')).toBe(true);
    expect(TAURI.test('// see "@tauri-apps" in desktopClient')).toBe(false);
  });
});
