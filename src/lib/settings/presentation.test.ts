import { describe, expect, it } from "vitest";
import { byGame, otherRepositories, sendable } from "./presentation";
import type { Setting } from "./types";

function setting(
  key: string,
  game: string | null,
  extra: Partial<Setting> = {},
): Setting {
  return {
    key,
    env: null,
    description: key,
    kind: "folder",
    game,
    declaredBy: "phobos-modkit",
    value: null,
    layer: "default",
    repository: null,
    central: null,
    default: null,
    exists: null,
    overridden: [],
    ...extra,
  };
}

describe("the settings page", () => {
  it("puts every game's settings first, then each game's", () => {
    const groups = byGame([
      setting("a", "rimworld"),
      setting("b", null),
      setting("c", "rimworld"),
      setting("d", "kenshi"),
    ]);
    expect(groups.map((g) => [g.game, g.settings.map((s) => s.key)])).toEqual([
      [null, ["b"]],
      ["rimworld", ["a", "c"]],
      ["kenshi", ["d"]],
    ]);
  });

  it("sends only one line with something in it", () => {
    expect(sendable("  K:\\history ")).toBe(true);
    expect(sendable("   ")).toBe(false);
    expect(sendable("K:\\one\nK:\\two")).toBe(false);
  });

  it("names the other repositories whose own file sets a different value", () => {
    const found = setting("artWorkPath", "rimworld", {
      layer: "repository",
      repository: "one",
      value: "K:/art",
      overridden: [
        { repository: "one", value: "K:/art" },
        { repository: "two", value: "L:/art" },
      ],
    });
    expect(otherRepositories(found)).toEqual([
      { repository: "two", value: "L:/art" },
    ]);
  });
});
