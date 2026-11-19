import { describe, expect, it } from "vitest";
import { GAME_ONLY_PAGES, pageServes } from "./kinds";

describe("what each kind of entry is shown", () => {
  it("shows a game every page, an entry from an older list included", () => {
    for (const page of [...GAME_ONLY_PAGES, "home", "changes", "codemap"]) {
      expect(pageServes("game", page)).toBe(true);
      expect(pageServes(undefined, page)).toBe(true);
    }
  });

  it("tells a set of tools it has no mods to install, saves, log, running game or game files, and shows it the rest", () => {
    for (const page of GAME_ONLY_PAGES)
      expect(pageServes("tools", page)).toBe(false);
    for (const page of [
      "home",
      "changes",
      "timeline",
      "codemap",
      "makeup",
      "tests",
      "reports",
    ])
      expect(pageServes("tools", page)).toBe(true);
  });
});
