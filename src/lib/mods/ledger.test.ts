import { describe, expect, it } from "vitest";
import {
  idsByRepository,
  settingId,
  split,
  type SettingChange,
} from "./ledger";

function change(
  key: string,
  time: string,
  commit: string | null = "c1",
): SettingChange {
  return {
    time,
    commit,
    subject: "s",
    mod: "Boats",
    product: "Sample Boats",
    key,
    label: null,
    what: "added",
    before: null,
    after: "True",
  };
}

describe("settings to look at", () => {
  it("names a change by its key, what happened and its commit", () => {
    expect(settingId(change("A", "t"))).toBe("A|added|c1");
    expect(settingId(change("A", "t", null))).toBe("A|added|now");
  });

  it("shows a setting two settings classes added in one commit once (0.28.1)", () => {
    const twin = change("PhobosBurns_CoughSounds", "2026-11-10");
    const { toLook } = split([
      {
        repository: "r",
        seen: [],
        settings: [twin, { ...twin, mod: "Other" }],
      },
    ]);
    expect(toLook).toHaveLength(1);
  });

  it("splits what is marked from what is not, newest first across repositories", () => {
    const { toLook, looked } = split([
      {
        repository: "one",
        settings: [change("A", "2026-11-01"), change("B", "2026-11-03")],
        seen: ["A|added|c1"],
      },
      { repository: "two", settings: [change("C", "2026-11-02")], seen: [] },
    ]);
    expect(toLook.map((i) => [i.repository, i.change.key])).toEqual([
      ["one", "B"],
      ["two", "C"],
    ]);
    expect(looked.map((i) => i.id)).toEqual(["A|added|c1"]);
    expect([...idsByRepository(toLook)]).toEqual([
      ["one", ["B|added|c1"]],
      ["two", ["C|added|c1"]],
    ]);
  });
});
