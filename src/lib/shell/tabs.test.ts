import { describe, expect, it } from "vitest";
import { tabAt, tabBeside, tabShown, type Tab } from "./tabs";

const TABS: Tab[] = [
  { id: "look", words: "a", panels: ["themes"] },
  { id: "folders", words: "b", keys: ["key"] },
  { id: "backups", words: "c", panels: ["records", "cleanup"] },
];

describe("tabs", () => {
  it("shows the tab a place names, else the one holding its panel, else the first", () => {
    expect(tabShown(TABS, { tab: "folders" })).toBe("folders");
    expect(tabShown(TABS, { panel: "cleanup" })).toBe("backups");
    expect(tabShown(TABS, { tab: "gone", panel: "themes" })).toBe("look");
    expect(tabShown(TABS, { key: "steamPath" })).toBe("folders");
    expect(tabShown(TABS, {})).toBe("look");
  });

  it("steps round from the last tab to the first and back", () => {
    expect(tabBeside(TABS, "look", 1)).toBe("folders");
    expect(tabBeside(TABS, "backups", 1)).toBe("look");
    expect(tabBeside(TABS, "look", -1)).toBe("backups");
  });

  it("finds a tab by its place in the row, from 1", () => {
    expect(tabAt(TABS, 2)).toBe("folders");
    expect(tabAt(TABS, 4)).toBeNull();
  });
});
