import { describe, expect, it } from "vitest";
import {
  blockedBy,
  entryParts,
  formatSize,
  groupByVersion,
  shortCommit,
} from "./presentation";
import type { Entry } from "./types";

function entry(version: string, text: string, lead = ""): Entry {
  return { version, section: "Fixed", text, lead, aboutSaves: false };
}

describe("the Mods page's words", () => {
  it("groups entries under their versions in the changelog's order", () => {
    const groups = groupByVersion(
      [entry("0.2.0", "a"), entry("0.1.0", "b"), entry("0.2.0", "c")],
      { "0.2.0": "Second release" },
    );
    expect(groups.map((g) => [g.version, g.summary, g.entries.length])).toEqual(
      [
        ["0.2.0", "Second release", 2],
        ["0.1.0", "", 1],
      ],
    );
  });

  it("splits an entry's bold opening from the rest", () => {
    expect(
      entryParts(entry("1", "**Boats float.** On water.", "Boats float.")),
    ).toEqual({ lead: "Boats float.", rest: "On water." });
    expect(entryParts(entry("1", "Safe with a running save.", "Safe"))).toEqual(
      { lead: "", rest: "Safe with a running save." },
    );
  });

  it("lets a backup be made while the game runs, but nothing else", () => {
    expect(blockedBy("backup", ["rimworld.exe"])).toBeNull();
    expect(blockedBy("restore", ["rimworld.exe"])).toBe("mods-blocked-running");
    expect(blockedBy("install", ["rimworld.exe"])).toBe("mods-blocked-running");
    expect(blockedBy("install", [])).toBeNull();
  });

  it("says sizes and commits briefly", () => {
    expect(formatSize(8_177_320)).toBe("8 MB");
    expect(formatSize(1_288_490_189)).toBe("1.2 GB");
    expect(formatSize(null)).toBe("");
    expect(shortCommit("4d332ddf0123")).toBe("4d332ddf");
    expect(shortCommit(null)).toBe("");
  });
});
