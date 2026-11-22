import { describe, expect, it } from "vitest";
import {
  byGame,
  cleanPath,
  otherRepositories,
  sendable,
  settingName,
  shown,
} from "./presentation";
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

describe("one line for each setting (0.66.0)", () => {
  const list = [
    setting("historyPath", null, { name: "Record of what happened" }),
    setting("rimworldPath", "rimworld", { value: "D:/Gone", exists: false }),
    setting("kenshiDataPath", "kenshi", { value: "D:/Kenshi", exists: true }),
  ];

  it("names a setting by its few words, else its sentence", () => {
    expect(list.map(settingName)).toEqual([
      "Record of what happened",
      "rimworldPath",
      "kenshiDataPath",
    ]);
  });

  it("shows all, every game's, one game's, or only those that need you", () => {
    const keys = (show: string) => shown(list, show).map((s) => s.key);
    expect(keys("all")).toHaveLength(3);
    expect(keys("every")).toEqual(["historyPath"]);
    expect(keys("kenshi")).toEqual(["kenshiDataPath"]);
    expect(keys("needs")).toEqual(["rimworldPath"]);
  });
});

describe("a folder typed or pasted (0.26.1)", () => {
  it("takes off the quotes Explorer's Copy as path puts round it", () => {
    expect(cleanPath('"D:\\Backups\\Companion"')).toBe(
      "D:\\Backups\\Companion",
    );
    expect(cleanPath("  'K:\\Copies'  ")).toBe("K:\\Copies");
    expect(cleanPath("\\\\NAS\\home\\Companion")).toBe(
      "\\\\NAS\\home\\Companion",
    );
    expect(cleanPath('D:\\Odd"Name')).toBe('D:\\Odd"Name');
  });

  it("never sends empty quotes", () => {
    expect(sendable('""')).toBe(false);
    expect(sendable('"D:\\Backups"')).toBe(true);
  });
});
