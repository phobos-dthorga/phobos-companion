import { describe, expect, it } from "vitest";
// @ts-expect-error: a plain script, read by Node directly
import * as release from "./release-files.mjs";

const CHANGELOG = `# Changelog

## [Unreleased]

## [0.85.0] - 2026-11-25

### Added

- **The updater.** It fetches a newer version.

## [0.84.0] - 2026-11-25

- **Commands.**
`;

describe("one release's files (0.85.0)", () => {
  it("takes the version's own changelog section as its notes", () => {
    expect(release.notesFor(CHANGELOG, "0.85.0")).toBe(
      "### Added\n\n- **The updater.** It fetches a newer version.",
    );
    expect(release.notesFor(CHANGELOG, "0.84.0")).toBe("- **Commands.**");
    expect(release.notesFor(CHANGELOG, "9.9.9")).toBe("");
  });

  it("writes latest.json with the signature's text and the plain installer's address on the tag", () => {
    const json = release.latestJson({
      version: "0.85.0",
      notes: "n",
      date: "2026-11-25T00:00:00.000Z",
      tag: "v0.85.0",
      signature: "dW50cnVzdGVk\n",
    });
    expect(json.platforms["windows-x86_64"]).toEqual({
      signature: "dW50cnVzdGVk",
      url: "https://github.com/phobos-dthorga/phobos-companion/releases/download/v0.85.0/DthorgaCompanion_0.85.0_x64-setup.exe",
    });
    expect(json.version).toBe("0.85.0");
    expect(json.pub_date).toBe("2026-11-25T00:00:00.000Z");
  });

  it("knows a version tag, and refuses anything else", () => {
    expect(release.versionOf("v0.85.0")).toBe("0.85.0");
    expect(() => release.versionOf("0.85.0")).toThrow();
    expect(() => release.versionOf("v1.2.3-beta")).toThrow();
  });

  it("names the installer in plain letters", () => {
    expect(release.plainName("0.85.0")).toBe(
      "DthorgaCompanion_0.85.0_x64-setup.exe",
    );
  });
});
